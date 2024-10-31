import logging
import os
import sys
from datetime import datetime

def setup_logging(log_level=logging.INFO):
    """Configure logging for the AWS instance scraper"""

    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.makedirs('logs')

    # Setup logging to both file and console
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    log_filename = f'logs/scraper_{timestamp}.log'

    # Configure root logger
    logger = logging.getLogger()
    logger.setLevel(log_level)

    # File handler with detailed formatting
    file_handler = logging.FileHandler(log_filename)
    file_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s'
    )
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

    # Console handler with simpler formatting
    console_handler = logging.StreamHandler(sys.stdout)
    console_formatter = logging.Formatter(
        '%(levelname)-8s: %(message)s'
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    return logger

def log_api_call(service, operation, params=None, response=None, error=None):
    """Helper to log API calls consistently"""
    logger = logging.getLogger(f'aws.{service}')

    if params is None:
        params = {}

    msg = f"API Call: {operation}"
    if error:
        logger.error(f"{msg} failed: {error}")
        logger.debug(f"Parameters: {params}")
    else:
        logger.debug(f"{msg} succeeded")
        logger.debug(f"Parameters: {params}")
        logger.debug(f"Response: {response}")

def log_scraping_progress(module, stage, items_processed=None, total_items=None):
    """Helper to log scraping progress consistently"""
    logger = logging.getLogger(f'scraper.{module}')

    if items_processed is not None and total_items is not None:
        progress = (items_processed / total_items) * 100
        logger.info(f"{stage}: Processed {items_processed}/{total_items} items ({progress:.1f}%)")
    else:
        logger.info(f"{stage}")