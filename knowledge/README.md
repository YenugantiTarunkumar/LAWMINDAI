# Knowledge Base

> This directory contains the grounding documents that power terms-ai's contract analysis and drafting capabilities.

---

## What This Directory Is For

The `knowledge/` directory is the **reference library** for terms-ai. When the AI analyzes a contract, rewrites a provision, or flags an issue, it draws on the documents in this directory for guidance. Think of it as the AI's "training manual" — the principles and patterns here determine the quality and consistency of every suggestion.

## Directory Structure

```
knowledge/
├── README.md                          ← You are here
├── drafting-guide.md                  ← Core drafting philosophy and rules
└── provision-patterns/
    ├── saas-agreements.md             ← SaaS contract patterns
    ├── data-processing.md             ← DPA/data processing patterns
    ├── ai-ml-terms.md                 ← AI/ML contract provisions
    └── open-source-licensing.md       ← Open source license patterns
```

## How to Add Your Own Grounding Documents

### Step 1: Fork This Repository

To customize terms-ai for your organization, fork this repo and add your own documents to the `knowledge/` directory.

### Step 2: Create Your Document

Add a Markdown (`.md`) file to the appropriate location:

- **General drafting guidance** → `knowledge/` root
- **Provision patterns for a specific contract type** → `knowledge/provision-patterns/`

### Step 3: Follow the File Naming Convention

| Convention | Example | Description |
|---|---|---|
| Lowercase | `saas-agreements.md` | All lowercase |
| Kebab-case | `data-processing.md` | Hyphens between words |
| Descriptive | `ai-ml-terms.md` | Name reflects the content |
| `.md` extension | `nda-patterns.md` | Always Markdown |

**Good names:** `enterprise-licensing.md`, `healthcare-compliance.md`, `employment-agreements.md`

**Bad names:** `doc1.md`, `NEW_STUFF.md`, `My Notes.md`

### Step 4: Structure Your Document

Each document should follow this pattern:

```markdown
# Title

> Brief description of what this document covers.

---

## Section Name

### Traditional Version

> The verbose/legalese version of the provision.

### Improved Version

> The plain-language rewrite.

**What changed:** Explanation of improvements.
```

### Step 5: Restart the Application

The knowledge base is loaded at startup and cached. After adding new files, restart the application to pick up your changes.

## How the Knowledge Base Loader Works

The `src/lib/contracts/knowledge-base.ts` module handles loading:

1. **Discovery**: It reads all `.md` files from `knowledge/` and its subdirectories, as well as provision examples from `src/lib/contracts/provision-examples/`.
2. **Concatenation**: All files are concatenated into a single context string, separated by headers indicating the source file.
3. **Caching**: The result is cached in memory after the first load. Subsequent calls return the cached version instantly.
4. **Error handling**: Missing files or directories are handled gracefully — the loader skips them and continues.

### Loading Order

Files are loaded in this order:

1. `knowledge/drafting-guide.md` (core rules — loaded first)
2. `knowledge/README.md`
3. Other files in `knowledge/` (alphabetical)
4. Files in `knowledge/provision-patterns/` (alphabetical)
5. Files in `src/lib/contracts/provision-examples/` (alphabetical)

## Example: Customizing for Your Organization

### Adding Industry-Specific Patterns

If your organization focuses on healthcare:

```markdown
# knowledge/provision-patterns/healthcare-compliance.md

# Provision Patterns: Healthcare Compliance

> HIPAA-aligned contract provisions for covered entities and business associates.

## 1. Business Associate Agreement (BAA)

### Traditional Version
> ...

### Improved Version
> ...
```

### Adding Your Contract Templates

You can add your organization's standard templates as reference documents:

```markdown
# knowledge/our-standard-nda.md

# [Company Name] Standard NDA — Reference Template

> This is our standard mutual NDA template. The AI should use this as the
> baseline when reviewing or drafting NDAs for our organization.

## Key Terms
- Confidentiality period: 3 years
- Carve-outs: publicly available information, independently developed, ...
- Governing law: Delaware
```

### Adding Jurisdiction-Specific Guidance

```markdown
# knowledge/eu-specific-guidance.md

# EU-Specific Drafting Guidance

> Additional rules for contracts governed by EU law or involving EU parties.

## GDPR Considerations
...

## EU AI Act Requirements
...
```

## Tips

- **Quality over quantity.** A few well-written, comprehensive documents are better than many shallow ones.
- **Use examples.** Before/after examples are the most effective way to train consistent AI behavior.
- **Keep it current.** Review and update documents when laws change or your organization's standards evolve.
- **Test your changes.** After adding new knowledge documents, run a few contract reviews to verify the AI applies your guidance correctly.

---

*This knowledge base is open-source. Contributions are welcome — see the main repository README for contribution guidelines.*
