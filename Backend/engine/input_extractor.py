import csv
import io
from typing import List


def _from_raw_list(data: List[str]) -> List[str]:
    return [item.strip() for item in data if item.strip()]


def _from_csv(file_content: str, target_column: str) -> List[str]:
    """Parse CSV content and extract the chosen column."""
    if not target_column:
        # No column chosen — treat each line as an entry
        return [line.strip() for line in file_content.split("\n") if line.strip()]

    reader = csv.DictReader(io.StringIO(file_content))
    if not reader.fieldnames or target_column not in reader.fieldnames:
        raise ValueError(
            f"Column '{target_column}' not found. Available: {list(reader.fieldnames)}"
        )
    return [
        row[target_column].strip()
        for row in reader
        if row.get(target_column, "").strip()
    ]


def _from_txt(file_content: str) -> List[str]:
    return [line.strip() for line in file_content.split("\n") if line.strip()]


class InputExtractor:
    """
    Dumb, generic class. Converts any user input format into a clean Python list.
    Knows nothing about Croma, Blinkit, or any target.
    """

    INPUT_TYPES = {"raw_list", "single_url", "device_upload_csv", "device_upload_txt", "project_file"}

    @staticmethod
    def extract(input_type: str, input_data: List[str], file_content: str = "", target_column: str = "") -> List[str]:
        if input_type == "raw_list":
            return _from_raw_list(input_data)
        elif input_type == "single_url":
            return [input_data[0].strip()] if input_data and input_data[0].strip() else []
        elif input_type == "device_upload_csv":
            return _from_csv(file_content, target_column)
        elif input_type == "device_upload_txt":
            return _from_txt(file_content)
        else:
            raise ValueError(f"Unknown input_type '{input_type}'. Must be one of {InputExtractor.INPUT_TYPES}")
