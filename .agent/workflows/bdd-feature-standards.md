---
description: How to write BDD feature files with unique scenario IDs
---

# BDD Feature File Standards

When creating BDD (Gherkin) feature files, follow these rules:

## 1. Unique Scenario IDs

Each scenario MUST have a unique ID tag following this format:

```gherkin
@category_tag @PREFIX-XXX
Scenario: Description of the scenario
```

### ID Prefixes by Feature Area:

| Feature Area | Prefix | Example |
|--------------|--------|---------|
| Order Escrow | ESC | @ESC-001 |
| Takaful Commission | TAK | @TAK-001 |
| Emergency Transfer | EMT | @EMT-001 |
| Courier Cash Registry | CCR | @CCR-001 |
| Takaful Benefits | TBN | @TBN-001 |
| Order Cancellation | OCA | @OCA-001 |
| Authentication | AUT | @AUT-001 |
| Payment | PAY | @PAY-001 |

### Rules:
- IDs must be sequential within each feature file (001, 002, 003...)
- IDs must be unique across the entire test suite
- Format: `@PREFIX-XXX` where XXX is a 3-digit number

## 2. Feature File Structure

```gherkin
@feature_tag
Feature: Feature Name
  As a [role]
  I want to [action]
  So that [benefit]

  Background:
    Given common setup steps

  # ========================================
  # Section Header
  # ========================================

  @category_tag @PREFIX-001
  Scenario: Descriptive scenario name
    Given precondition
    When action
    Then expected result
```

## 3. Tag Hierarchy

```
@feature_tag          (required - feature level)
  @category_tag       (required - groups related scenarios)
    @PREFIX-XXX       (required - unique ID)
```
