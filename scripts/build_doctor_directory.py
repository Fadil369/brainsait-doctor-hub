#!/usr/bin/env python3
"""Build the searchable doctor directory JSON from the Apple Numbers export."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import List

from numbers_parser import Document

REPO_ROOT = Path(__file__).resolve().parents[1]
NUMBERS_PATH = REPO_ROOT / "doctors_database_20251126_211832.numbers"
OUTPUT_PATH = REPO_ROOT / "public" / "data" / "doctors-directory.json"

BLOCK_KEYWORDS = {
    "hospital",
    "medical",
    "clinic",
    "company",
    "co.",
    "est",
    "contracting",
    "insurance",
    "drops",
    "tablet",
    "capsule",
    "solution",
    "syrup",
    "pharma",
    "laboratory",
    "lab",
    "finance",
    "statement",
    "analysis",
    "services",
    "provider",
    "bupa",
    "tawnia",
    "claim",
    "eligibility",
    "response",
    "direct",
    "copy",
}

SPECIALTY_KEYWORDS = [
    ("cardio", "Cardiology"),
    ("derma", "Dermatology"),
    ("dermato", "Dermatology"),
    ("neuro", "Neurology"),
    ("nephro", "Nephrology"),
    ("pulmo", "Pulmonology"),
    ("gastro", "Gastroenterology"),
    ("endo", "Endocrinology"),
    ("onco", "Oncology"),
    ("pedi", "Pediatrics"),
    ("ortho", "Orthopedics"),
    ("psy", "Psychiatry"),
    ("ophth", "Ophthalmology"),
    ("ent", "Otolaryngology"),
    ("uro", "Urology"),
    ("obst", "Obstetrics & Gynecology"),
    ("gyn", "Obstetrics & Gynecology"),
]


def normalize_whitespace(value: str) -> str:
    return " ".join(value.split())


def split_multi_value(value: str) -> List[str]:
    if not value:
        return []
    parts = re.split(r"[;\n]+", value)
    return [normalize_whitespace(part.strip(" ;")) for part in parts if part.strip(" ;")]


def looks_like_doctor(name: str) -> bool:
    if not name:
        return False
    normalized = normalize_whitespace(name)
    lower = normalized.lower()
    if lower in {"doctor name", "name", "(blank)"}:
        return False
    if any(keyword in lower for keyword in BLOCK_KEYWORDS):
        return False
    if re.search(r"\d", normalized):
        return False
    tokens = [token for token in re.split(r"[-,\s]+", normalized) if token]
    return len(tokens) >= 2


def infer_specialty(*fields: str) -> str:
    combined = " ".join(field.lower() for field in fields if field)
    for keyword, specialty in SPECIALTY_KEYWORDS:
        if keyword in combined:
            return specialty
    return "General Practice"


def build_directory():
    if not NUMBERS_PATH.exists():
        raise FileNotFoundError(f"Numbers file not found at {NUMBERS_PATH}")

    doc = Document(str(NUMBERS_PATH))
    table = doc.sheets[0].tables[0]
    rows = table.rows()
    headers = [cell.value if cell else "" for cell in rows[0]]

    name_idx = headers.index("Doctor Name")
    contact_idx = headers.index("Contact Information")
    cred_idx = headers.index("Credentials/Specialty")
    reg_idx = headers.index("Registration Numbers")
    source_idx = headers.index("Source File")

    entries = {}

    for row in rows[1:]:
        if name_idx >= len(row):
            continue
        cell = row[name_idx]
        if not cell or cell.value is None:
            continue
        name = normalize_whitespace(str(cell.value))
        if not looks_like_doctor(name):
            continue

        contact_value = ""
        cred_value = ""
        reg_value = ""
        source_value = ""

        if contact_idx < len(row) and row[contact_idx] and row[contact_idx].value:
            contact_value = normalize_whitespace(str(row[contact_idx].value))
        if cred_idx < len(row) and row[cred_idx] and row[cred_idx].value:
            cred_value = normalize_whitespace(str(row[cred_idx].value))
        if reg_idx < len(row) and row[reg_idx] and row[reg_idx].value:
            reg_value = normalize_whitespace(str(row[reg_idx].value))
        if source_idx < len(row) and row[source_idx] and row[source_idx].value:
            source_value = str(row[source_idx].value)

        contacts = split_multi_value(contact_value)
        credentials = split_multi_value(cred_value)
        reg_numbers = split_multi_value(reg_value)
        specialty = infer_specialty(cred_value, reg_value)

        key_basis = f"{name.lower()}|{reg_numbers[0] if reg_numbers else source_value.lower()}"
        entry_id = hashlib.sha1(key_basis.encode("utf-8")).hexdigest()[:12]

        if entry_id in entries:
            existing = entries[entry_id]
            existing["contacts"] = sorted({*existing["contacts"], *contacts})
            existing["credentials"] = sorted({*existing["credentials"], *credentials})
            existing["registrationNumbers"] = sorted({*existing["registrationNumbers"], *reg_numbers})
            continue

        entries[entry_id] = {
            "id": entry_id,
            "name": name,
            "specialty": specialty,
            "contacts": contacts,
            "credentials": credentials,
            "registrationNumbers": reg_numbers,
            "sourceFile": source_value,
        }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(list(entries.values()), f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(entries)} doctor-like entries to {OUTPUT_PATH}")


if __name__ == "__main__":
    build_directory()
