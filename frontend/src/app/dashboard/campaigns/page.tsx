"use client";

import React, { useState, useEffect } from "react";
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  X,
  Play,
  Users,
  Sliders,
  ChevronRight,
  Info,
  Clock,
  Phone,
  PhoneCall,
  PhoneOff
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import { Input } from "@/components/UI/Input";
import { 
  getCampaigns, 
  createCampaign, 
  deleteCampaign, 
  getAgentConfigs, 
  getContacts, 
  getCampaignContacts, 
  addContactsToCampaign, 
  removeContactFromCampaign,
  triggerCallCampaign,
  triggerSingleCall,
  getCallLogs,
  getUserInfo,
  createContact,
  updateCampaignStatus,
  type Campaign,
  type AgentConfig,
  type Contact,
  type CallLog
} from "@/lib/api";


export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedCampaignContacts, setSelectedCampaignContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddContactsModal, setShowAddContactsModal] = useState(false);

  // Create campaign form values
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [voiceAgentConfigId, setVoiceAgentConfigId] = useState("");

  // Add contacts checklist state
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [callingContactIds, setCallingContactIds] = useState<Set<string>>(new Set());

  // Status notifications
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    loadInitialData();
    const stored = getUserInfo();
    setIsPro(stored.plan === "pro");
    
    // Poll for call and campaign updates every 7 seconds
    const interval = setInterval(loadDataSilent, 7000);
    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [campaignsData, configsData, contactsData, callLogsData] = await Promise.all([
        getCampaigns(),
        getAgentConfigs(),
        getContacts(),
        getCallLogs()
      ]);
      setCampaigns(campaignsData);
      setConfigs(configsData);
      setAllContacts(contactsData);
      setCallLogs(callLogsData);
      
      if (campaignsData.length > 0) {
        handleSelectCampaign(campaignsData[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load campaigns data");
    } finally {
      setLoading(false);
    }
  };

  const loadDataSilent = async () => {
    try {
      const [campaignsData, callLogsData] = await Promise.all([
        getCampaigns(),
        getCallLogs()
      ]);
      setCampaigns(campaignsData);
      setCallLogs(callLogsData);
      
      // Update selected campaign reference if it exists
      setSelectedCampaign((curr) => {
        if (!curr) return null;
        const updated = campaignsData.find(c => c.id === curr.id);
        
        // Silent reload of campaign contacts to update details
        getCampaignContacts(curr.id).then(data => {
          setSelectedCampaignContacts(data);
        }).catch(() => {});
        
        return updated || curr;
      });
    } catch {
      // ignore silent fetch failures
    }
  };


  const handleSelectCampaign = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setError(null);
    setSuccess(null);
    try {
      setContactsLoading(true);
      const data = await getCampaignContacts(campaign.id);
      setSelectedCampaignContacts(data);
    } catch (err: any) {
      setError(err.message || "Failed to load campaign contacts");
    } finally {
      setContactsLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !voiceAgentConfigId) {
      setError("Name and Voice Agent Config are required.");
      return;
    }

    try {
      setSubmitting(true);
      const created = await createCampaign(name, description, voiceAgentConfigId);
      
      // Look up agent name manually for local update
      const matchedConfig = configs.find(c => c.id === voiceAgentConfigId);
      const updatedCampaign = {
        ...created,
        voice_agent_configurations: matchedConfig ? { name: matchedConfig.name } : undefined
      };

      setCampaigns((prev) => [updatedCampaign, ...prev]);
      setSelectedCampaign(updatedCampaign);
      setSelectedCampaignContacts([]);
      setSuccess("Campaign created successfully!");
      setShowCreateModal(false);

      // Reset form
      setName("");
      setDescription("");
      setVoiceAgentConfigId("");
    } catch (err: any) {
      setError(err.message || "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign? All logs associated will remain but campaign structure will be deleted.")) return;
    setError(null);
    setSuccess(null);

    try {
      await deleteCampaign(id);
      const remaining = campaigns.filter(c => c.id !== id);
      setCampaigns(remaining);
      if (selectedCampaign?.id === id) {
        if (remaining.length > 0) {
          handleSelectCampaign(remaining[0]);
        } else {
          setSelectedCampaign(null);
          setSelectedCampaignContacts([]);
        }
      }
      setSuccess("Campaign deleted successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to delete campaign");
    }
  };

  const handleLaunchCampaign = async () => {
    if (!selectedCampaign) return;
    if (!isPro) {
      setError("Campaign dialing is a Premium feature. Please upgrade to Pro in Settings to dial campaigns.");
      return;
    }
    if (selectedCampaignContacts.length === 0) {
      setError("Please add at least one contact to the campaign before launching.");
      return;
    }
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      await triggerCallCampaign(selectedCampaign.id);
      
      // Update local state
      const updated = { ...selectedCampaign, status: 'active' };
      setCampaigns(prev => prev.map(c => c.id === selectedCampaign.id ? updated : c));
      setSelectedCampaign(updated);
      
      setSuccess("Call campaign launched successfully! AI agents are dialing now.");
    } catch (err: any) {
      setError(err.message || "Failed to launch campaign calls");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick contact form inside modal
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");

  const handleQuickAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName || !quickPhone) {
      setError("Name and Phone are required for the new contact.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const newContact = await createContact(quickName, quickPhone);
      setAllContacts(prev => [newContact, ...prev]);
      setSelectedContactIds(prev => [...prev, newContact.id]);
      setQuickName("");
      setQuickPhone("");
      setShowQuickAdd(false);
      setSuccess("Contact created and selected!");
    } catch (err: any) {
      setError(err.message || "Failed to create contact");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAddContacts = () => {
    setSelectedContactIds([]);
    setQuickName("");
    setQuickPhone("");
    setShowQuickAdd(false);
    setError(null);
    setShowAddContactsModal(true);
  };

  const handleAddContactsSubmit = async () => {
    if (!selectedCampaign || selectedContactIds.length === 0) {
      setShowAddContactsModal(false);
      return;
    }
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      await addContactsToCampaign(selectedCampaign.id, selectedContactIds);
      
      // Reset campaign status back to draft if it was completed
      if (selectedCampaign.status === 'completed') {
        await updateCampaignStatus(selectedCampaign.id, 'draft');
        const updated = { ...selectedCampaign, status: 'draft' as const };
        setSelectedCampaign(updated);
        setCampaigns(prev => prev.map(c => c.id === selectedCampaign.id ? updated : c));
      }

      // Reload contacts
      const updatedContacts = await getCampaignContacts(selectedCampaign.id);
      setSelectedCampaignContacts(updatedContacts);
      setSuccess(`Added ${selectedContactIds.length} contacts to campaign.`);
      setShowAddContactsModal(false);
    } catch (err: any) {
      setError(err.message || "Failed to assign contacts");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    if (!selectedCampaign) return;
    setError(null);
    setSuccess(null);

    try {
      await removeContactFromCampaign(selectedCampaign.id, contactId);
      setSelectedCampaignContacts(prev => prev.filter(c => c.id !== contactId));
      setSuccess("Contact removed from campaign.");
    } catch (err: any) {
      setError(err.message || "Failed to remove contact");
    }
  };

  const handleToggleSelectContact = (id: string) => {
    setSelectedContactIds((prev) => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleCallContact = async (contact: Contact) => {
    if (callingContactIds.has(contact.id)) return;
    setCallingContactIds(prev => new Set(prev).add(contact.id));
    setError(null);
    try {
      const result = await triggerSingleCall(contact.phone, contact.name, {
        campaignId: selectedCampaign?.id,
        contactId: contact.id,
      });
      setSuccess(`📞 Calling ${contact.name} — call initiated!`);
    } catch (err: any) {
      setError(err.message || `Failed to call ${contact.name}`);
    } finally {
      setCallingContactIds(prev => {
        const next = new Set(prev);
        next.delete(contact.id);
        return next;
      });
    }
  };

  // Contacts that can be added (not already in selectedCampaignContacts)
  const assignableContacts = allContacts.filter(
    (c) => !selectedCampaignContacts.some((sc) => sc.id === c.id)
  );

  // Calculate campaign stats
  const campaignLogs = selectedCampaign ? callLogs.filter(log => log.campaign_id === selectedCampaign.id) : [];
  const completedCalls = campaignLogs.filter(log => {
    const s = log.status?.toLowerCase() || '';
    return s === 'completed' || s === 'ended' || s === 'success';
  }).length;
  const failedCalls = campaignLogs.filter(log => {
    const s = log.status?.toLowerCase() || '';
    return s === 'failed' || s === 'error' || s === 'rejected';
  }).length;
  const totalContactsCount = selectedCampaignContacts.length;
  const pendingCalls = Math.max(0, totalContactsCount - completedCalls - failedCalls);

  return (

    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-violet-400" />
            Outbound AI Calls
          </h1>
          <p className="text-gray-400 text-sm">
            AI agents call your contacts automatically. You define the persona, script, and voice — the AI does the talking.
          </p>
        </div>
        
        {!isPro && campaigns.length >= 1 ? (
          <div className="flex flex-col items-end gap-1">
            <Button size="sm" disabled className="h-10 opacity-50 cursor-not-allowed">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
            <span className="text-[10px] text-violet-400 font-semibold tracking-wider uppercase">
              Free Tier Limit Reached
            </span>
          </div>
        ) : (
          <Button size="sm" onClick={() => { setShowCreateModal(true); setError(null); }} className="h-10">
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
          <p className="text-gray-400 text-sm">Loading campaigns dashboard...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center glass rounded-xl">
          <div className="p-3 rounded-2xl bg-zinc-800/30 border border-white/[0.08]/50 mb-4 text-gray-500">
            <Megaphone className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No campaigns created yet</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            Get started by creating a campaign, assigning contacts, and specifying an AI agent config.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Campaign Selector Column */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Campaign</h2>
            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {campaigns.map((camp) => {
                const isActive = selectedCampaign?.id === camp.id;
                return (
                  <div
                    key={camp.id}
                    onClick={() => handleSelectCampaign(camp)}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      isActive
                        ? "bg-violet-600/10 border-violet-500/40 text-white shadow-md shadow-indigo-500/5"
                        : "bg-zinc-900/30 border-white/[0.08]/60 text-gray-400 hover:border-white/[0.08] hover:text-gray-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className={`text-sm font-semibold truncate ${isActive ? "text-white" : "text-gray-200"}`}>
                        {camp.name}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                        Agent: {camp.voice_agent_configurations?.name || "No Config Assigned"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        camp.status === 'active' 
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-pulse"
                          : camp.status === 'completed'
                          ? "bg-violet-500/10 border border-violet-500/20 text-violet-400"
                          : "bg-[#1F2937]border border-white/[0.08] text-gray-400"
                      }`}>
                        {camp.status}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-600 shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Campaign Detail / Contacts Panel (2 Columns Width) */}
          {selectedCampaign && (
            <div className="lg:col-span-2 space-y-6">
              <Card className="border border-white/[0.08] bg-zinc-900/10">
                <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-white/[0.08]/50">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {selectedCampaign.name}
                    </CardTitle>
                    <CardDescription className="mt-1 leading-relaxed">
                      {selectedCampaign.description || "No description provided."}
                    </CardDescription>
                    
                    <div className="flex flex-wrap gap-4 mt-3">
                      <div className="flex items-center text-xs text-gray-500 gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-gray-400" />
                        Agent Configuration: 
                        <span className="text-gray-300 font-medium">{selectedCampaign.voice_agent_configurations?.name || "—"}</span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 gap-1.5">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        Target Contacts: 
                        <span className="text-gray-300 font-medium">{selectedCampaignContacts.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">

                    <button
                      onClick={() => handleDeleteCampaign(selectedCampaign.id)}
                      className="p-2.5 rounded-lg border border-white/[0.08] bg-zinc-950 text-gray-500 hover:text-rose-400 hover:border-rose-500/10 transition-all duration-200"
                      title="Delete Campaign"
                      disabled={submitting}
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                    
                    {selectedCampaign.status !== 'completed' && (
                      <Button
                        onClick={handleLaunchCampaign}
                        isLoading={submitting}
                        disabled={selectedCampaignContacts.length === 0}
                        className={`h-10 !px-4 ${
                          selectedCampaign.status === 'active'
                            ? "bg-emerald-600 hover:bg-emerald-500"
                            : "bg-violet-600 hover:bg-violet-500"
                        } ${!isPro ? "opacity-50" : ""}`}
                      >
                        <Play className="h-4 w-4 mr-2 fill-current" />
                        {selectedCampaign.status === 'active' ? "Call Remainder" : "Launch Campaign"} {!isPro && "(Pro Only)"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  {/* Campaign Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 border-b border-white/[0.08]/40 bg-zinc-950/20">
                    {/* Total Contacts */}
                    <div className="p-4 rounded-xl bg-zinc-900/30 border border-white/[0.04] flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total Contacts</p>
                        <p className="text-lg font-bold text-white mt-0.5">{totalContactsCount}</p>
                      </div>
                    </div>

                    {/* Pending Calls */}
                    <div className="p-4 rounded-xl bg-zinc-900/30 border border-white/[0.04] flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Pending Calls</p>
                        <p className="text-lg font-bold text-white mt-0.5">{pendingCalls}</p>
                      </div>
                    </div>

                    {/* Completed Calls */}
                    <div className="p-4 rounded-xl bg-zinc-900/30 border border-white/[0.04] flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <PhoneCall className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Completed Calls</p>
                        <p className="text-lg font-bold text-white mt-0.5">{completedCalls}</p>
                      </div>
                    </div>

                    {/* Failed Calls */}
                    <div className="p-4 rounded-xl bg-zinc-900/30 border border-white/[0.04] flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400">
                        <PhoneOff className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Failed Calls</p>
                        <p className="text-lg font-bold text-white mt-0.5">{failedCalls}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex items-center justify-between border-b border-white/[0.08]/40">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <Users className="h-4 w-4 text-violet-400" />
                      Target Contacts Assigned
                    </h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleOpenAddContacts}
                      disabled={submitting}
                    >
                      Add Contacts
                    </Button>
                  </div>

                  {contactsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
                    </div>
                  ) : selectedCampaignContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <Info className="h-5 w-5 text-gray-600 mb-2" />
                      <p className="text-xs text-gray-500">No contacts assigned to this campaign yet.</p>
                      <button 
                        onClick={handleOpenAddContacts} 
                        className="text-xs text-violet-400 font-semibold mt-1 hover:underline"
                      >
                        Click here to assign contacts
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-850/30 max-h-[350px] overflow-y-auto">
                      {selectedCampaignContacts.map((contact) => {
                        const isCalling = callingContactIds.has(contact.id);
                        const contactLog = campaignLogs
                          .filter(log => log.contact_id === contact.id)
                          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];

                        return (
                          <div 
                            key={contact.id} 
                            className="flex items-center justify-between p-4 hover:bg-zinc-800/10 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white">{contact.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-gray-500">{contact.phone}</p>
                                {contactLog && (
                                  <>
                                    <span className="text-zinc-600 text-xs font-semibold">•</span>
                                    <span 
                                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${
                                        contactLog.status === 'completed' || contactLog.status === 'ended' || contactLog.status === 'success'
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                          : contactLog.status === 'failed' || contactLog.status === 'error' || contactLog.status === 'rejected'
                                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 cursor-help'
                                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                                      }`}
                                      title={contactLog.summary || undefined}
                                    >
                                      {contactLog.status}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              {/* Per-contact single call button */}
                              <button
                                onClick={() => handleCallContact(contact)}
                                disabled={isCalling || submitting}
                                title={`Call ${contact.name}`}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                                  isCalling
                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-not-allowed'
                                    : 'bg-violet-600/10 border border-violet-500/20 text-violet-400 hover:bg-violet-600/20 hover:border-violet-400/40'
                                }`}
                              >
                                {isCalling ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Phone className="h-3 w-3" />
                                )}
                                {isCalling ? 'Calling…' : 'Call'}
                              </button>

                              {/* Remove contact button */}
                              <button
                                onClick={() => handleRemoveContact(contact.id)}
                                className="p-1.5 rounded text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                title="Remove contact from campaign"
                                disabled={submitting}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Create Outbound Campaign</CardTitle>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <form onSubmit={handleCreateCampaign}>
              <CardContent className="space-y-4">
                <Input
                  label="Campaign Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g. Parent teacher conference alert"
                  disabled={submitting}
                />
                
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the call campaign purpose"
                    className="w-full min-h-[70px] rounded-lg border border-white/[0.08] bg-zinc-950 p-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">AI Voice Agent Configuration *</label>
                  <select
                    value={voiceAgentConfigId}
                    onChange={(e) => setVoiceAgentConfigId(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-zinc-950 p-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                    disabled={submitting}
                  >
                    <option value="">-- Choose AI Config Persona --</option>
                    {configs.map((cfg) => (
                      <option key={cfg.id} value={cfg.id}>
                        {cfg.name}
                      </option>
                    ))}
                  </select>
                  {configs.length === 0 && (
                    <p className="text-[10px] text-amber-500 mt-1">
                      No configurations exist. Please create an Agent Configuration first.
                    </p>
                  )}
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={submitting}>
                  Create Campaign
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add Contacts Checklist Modal */}
      {showAddContactsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md flex flex-col max-h-[85vh]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/[0.08]/40">
              <div>
                <CardTitle className="text-lg">Select Contacts</CardTitle>
                <CardDescription>Select parents or students to add to campaign</CardDescription>
              </div>
              <button onClick={() => setShowAddContactsModal(false)} className="text-gray-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Quick Create Contact Form */}
              {!showQuickAdd ? (
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(true)}
                  className="w-full py-2.5 px-3 border border-dashed border-violet-500/30 hover:border-violet-500/60 rounded-xl text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center justify-center gap-1.5 transition-colors bg-zinc-950/40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Quick Create New Contact
                </button>
              ) : (
                <form onSubmit={handleQuickAddContact} className="p-4 rounded-xl border border-violet-500/20 bg-violet-600/5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400">Quick New Contact</span>
                    <button
                      type="button"
                      onClick={() => setShowQuickAdd(false)}
                      className="text-gray-500 hover:text-white text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                  <Input
                    label="Name *"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="Contact name"
                    disabled={submitting}
                    className="h-9 py-1 px-3 text-xs bg-zinc-950/80"
                  />
                  <Input
                    label="Phone Number *"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    placeholder="+916303875878"
                    disabled={submitting}
                    className="h-9 py-1 px-3 text-xs bg-zinc-950/80"
                  />
                  <div className="flex justify-end gap-1.5 pt-1">
                    <Button
                      type="submit"
                      size="sm"
                      className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white font-medium px-3.5"
                      isLoading={submitting}
                    >
                      Create & Select
                    </Button>
                  </div>
                </form>
              )}

              <div className="border-t border-white/[0.06] my-2" />

              {assignableContacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  All active contacts in database are already assigned to this campaign.
                </div>
              ) : (
                assignableContacts.map((contact) => {
                  const isChecked = selectedContactIds.includes(contact.id);
                  return (
                    <div 
                      key={contact.id}
                      onClick={() => handleToggleSelectContact(contact.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isChecked 
                          ? "bg-violet-600/10 border-violet-500/30 text-white" 
                          : "bg-zinc-950 border-white/[0.08]/80 text-gray-400 hover:border-white/[0.08]"
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent click
                        className="accent-indigo-600"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-200">{contact.name}</p>
                        <p className="text-[10px] text-gray-500">{contact.phone}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-6 border-t border-white/[0.08]/40 flex justify-end gap-2 bg-zinc-900/20">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddContactsModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddContactsSubmit} 
                size="sm" 
                isLoading={submitting}
                disabled={selectedContactIds.length === 0}
              >
                Assign Selected ({selectedContactIds.length})
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
