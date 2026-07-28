import logging
from typing import Optional

try:
    import structlog

    def setup_logging(log_level: Optional[str] = None):
        level = log_level or "INFO"
        structlog.configure(
            processors=[
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.add_log_level,
                structlog.processors.JSONRenderer(),
            ],
            wrapper_class=structlog.make_filtering_bound_logger(logging.getLevelName(level)),
        )
        logging.basicConfig(
            level=logging.getLevelName(level),
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[logging.StreamHandler()],
        )
except ImportError:
    def setup_logging(log_level: Optional[str] = None):
        level = log_level or "INFO"
        logging.basicConfig(
            level=logging.getLevelName(level),
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )