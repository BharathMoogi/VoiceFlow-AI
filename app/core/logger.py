import logging
from loguru import logger

# Configure loguru logger to also output to standard logging
class InterceptHandler(logging.Handler):
    def emit(self, record):
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno
        logger.opt(depth=6, exception=record.exc_info).log(level, record.getMessage())

# Redirect standard logging to loguru
logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)

# Example: set a default sink (console) with JSON formatting
logger.add("sys.stderr", format="{time} | {level} | {message}", serialize=True)

# Export logger for import elsewhere
__all__ = ["logger"]
