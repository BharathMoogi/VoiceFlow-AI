"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Users, 
  Upload, 
  Plus, 
  Search, 
  Trash2, 
  Loader2, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  X
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import { Input } from "@/components/UI/Input";
import { getContacts, createContact, deleteContact, uploadContactsCSV, type Contact } from "@/lib/api";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Manual contact form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  
  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await getContacts();
      setContacts(data);
    } catch (err: any) {
      setError(err.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newName || !newPhone) {
      setError("Name and Phone are required.");
      return;
    }

    try {
      setSubmitting(true);
      const contact = await createContact(newName, newPhone, newEmail, newNotes);
      setContacts((prev) => [contact, ...prev]);
      setSuccess("Contact added successfully!");
      
      // Reset form
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewNotes("");
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to add contact");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    setError(null);
    setSuccess(null);

    try {
      await deleteContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setSuccess("Contact deleted successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to delete contact");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
    setError(null);
    setSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n");
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      
      const parsed: any[] = [];
      // Read first 5 lines for preview
      const previewLines = lines.slice(1, 6);
      
      previewLines.forEach(line => {
        if (!line.trim()) return;
        const values = line.split(",").map(v => v.trim());
        const entry: any = {};
        headers.forEach((header, index) => {
          entry[header] = values[index] || "";
        });
        parsed.push(entry);
      });
      
      setCsvPreview(parsed);
    };
    reader.readAsText(file);
  };

  const handleCSVUpload = async () => {
    if (!csvFile) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n");
        if (lines.length <= 1) throw new Error("CSV file is empty");

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const contactsToUpload: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(",").map(v => v.trim());
          const item: any = {};
          
          headers.forEach((header, index) => {
            item[header] = values[index] || "";
          });

          // Check required fields
          const name = item.name || item.fullname || item.full_name;
          const phone = item.phone || item.phonenumber || item.phone_number || item.telephone;
          const email = item.email || item.emailaddress || item.mail;
          const notes = item.notes || item.note || item.description || "";

          if (name && phone) {
            contactsToUpload.push({ name, phone, email, notes });
          }
        }

        if (contactsToUpload.length === 0) {
          throw new Error("No valid contacts found in CSV. Make sure you have 'name' and 'phone' columns.");
        }

        await uploadContactsCSV(contactsToUpload);
        setSuccess(`Successfully imported ${contactsToUpload.length} contacts!`);
        setCsvFile(null);
        setCsvPreview([]);
        loadContacts();
      } catch (err: any) {
        setError(err.message || "Failed to parse or upload CSV file");
      } finally {
        setSubmitting(false);
      }
    };
    reader.readAsText(csvFile);
  };

  // Filter contacts
  const filteredContacts = contacts.filter((c) => {
    const term = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.phone.toLowerCase().includes(term) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-violet-400" />
            Contacts & Parents
          </h1>
          <p className="text-gray-400 text-sm">
            Manage parents, students, and contacts for automated voice campaigns.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-10">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".csv" 
            className="hidden" 
          />
          
          <Button size="sm" onClick={() => setShowAddForm(true)} className="h-10">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
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

      {/* CSV Preview Drawer / Box */}
      {csvFile && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2 text-indigo-300">
                <FileText className="h-4 w-4" />
                CSV File Selected: {csvFile.name}
              </CardTitle>
              <CardDescription>
                Verify columns. Ensure you have 'name' and 'phone' column headers.
              </CardDescription>
            </div>
            <button onClick={() => { setCsvFile(null); setCsvPreview([]); }} className="text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            {csvPreview.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-white/[0.08] bg-zinc-950/50">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-zinc-900/60 text-gray-400 uppercase font-semibold">
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Phone</th>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/40 text-gray-300">
                    {csvPreview.map((row, index) => (
                      <tr key={index}>
                        <td className="p-2.5 font-medium">{row.name || row.fullname || row.full_name || "—"}</td>
                        <td className="p-2.5">{row.phone || row.phonenumber || row.phone_number || "—"}</td>
                        <td className="p-2.5">{row.email || "—"}</td>
                        <td className="p-2.5 truncate max-w-[150px]">{row.notes || row.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setCsvFile(null); setCsvPreview([]); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCSVUpload} isLoading={submitting}>
                Save Contacts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Contact Modal/Overlay Form */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Add New Contact</CardTitle>
              <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <form onSubmit={handleAddContact}>
              <CardContent className="space-y-4">
                <Input
                  label="Name *"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Parent or Contact name"
                  disabled={submitting}
                />
                <Input
                  label="Phone Number *"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+1234567890"
                  disabled={submitting}
                />
                <Input
                  label="Email (Optional)"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="parent@example.com"
                  disabled={submitting}
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Notes</label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="E.g. Student name: Alex, Grade 5"
                    className="w-full min-h-[80px] rounded-lg border border-white/[0.08] bg-zinc-950 p-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                    disabled={submitting}
                  />
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={submitting}>
                  Save Contact
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Main Grid: Filters + List */}
      <Card className="!p-0 overflow-hidden">
        <div className="p-5 border-b border-white/[0.08]/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-white/[0.08]/80 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>
          
          <div className="text-xs text-gray-500 font-medium">
            Showing {filteredContacts.length} of {contacts.length} contacts
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
            <p className="text-gray-400 text-sm">Loading contacts database...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="p-3 rounded-2xl bg-zinc-800/30 border border-white/[0.08]/50 mb-4 text-gray-500">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No contacts found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
              {searchQuery ? "No contacts match your search query." : "Upload a CSV file or add contacts manually to begin."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-zinc-900/30 text-gray-400 uppercase font-semibold text-xs tracking-wider">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Notes</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/30 text-gray-300">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-zinc-800/10 transition-colors duration-150">
                    <td className="px-6 py-4 font-medium text-white">{contact.name}</td>
                    <td className="px-6 py-4">{contact.phone}</td>
                    <td className="px-6 py-4 text-gray-400">{contact.email || "—"}</td>
                    <td className="px-6 py-4 max-w-[250px] truncate text-gray-500" title={contact.notes}>
                      {contact.notes || "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(contact.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
                        title="Delete contact"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
