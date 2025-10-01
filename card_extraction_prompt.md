# Card Image Analysis and Data Extraction Prompt

## Objective
Extract all offensive and defensive play cards from a zip file, analyze each card image, capture the play results from the bottom half of each card, and compile all information into a structured JSON format.

## Input Requirements
- A zip file containing all card images organized by style folders
- Expected structure: `cards/{Style Name}/{Play Name}.jpg`

## Expected Card Styles and Plays
Based on the Gridiron Strategy game:

**Offensive Styles (3 styles × 22 plays each = 66 cards):**
- **Pro Style**: Button Hook Pass, Down & In Pass, Down & Out Pass, Draw, End Run, Flair Pass, Long Bomb, Look In Pass, Pop Pass, Power Off Tackle, Power Up Middle, QB Keeper, Razzle Dazzle, Reverse, Run & Pass Option, Screen Pass, Sideline Pass, Slant Run, Stop & Go Pass, Trap, and 2 more
- **Ball Control**: Same 22 plays as Pro Style
- **Aerial Style**: Same 22 plays as Pro Style

**Defensive Cards (10 cards):**
- Goal Line, Short Yardage, Inside Blitz, Running, Run & Pass, Pass & Run, Passing, Outside Blitz, Prevent, Prevent Deep

## Task Breakdown

### Phase 1: Zip Extraction and File Organization
1. Extract the provided zip file
2. Organize files by style and play name
3. Validate that all expected cards are present (66 offensive + 10 defensive = 76 total)

### Phase 2: Card Analysis
For each card image:
1. **Identify Card Type**: Offensive or Defensive
2. **Extract Card Metadata**:
   - Style name (Pro Style, Ball Control, Aerial Style, Defense)
   - Play name
   - Card orientation (offensive cards are typically portrait, defensive are landscape)
3. **Analyze Bottom Section**:
   - Locate the results table (bottom 1/3 of the card)
   - Extract the 10 roll outcomes (roll_1 through roll_0)
   - Parse the yardage values (Y+10, Y-2, etc.)
   - Handle special outcomes (FUMBLE, INTERCEPT, LG, etc.)

### Phase 3: Data Validation
1. Verify that each offensive play has 10 roll outcomes (1-9, 0)
2. Ensure defensive cards are properly identified
3. Cross-reference with existing data files to identify discrepancies

### Phase 4: JSON Compilation
Compile all extracted data into the following JSON structure:

```json
{
  "metadata": {
    "extraction_date": "YYYY-MM-DD",
    "total_cards_processed": 76,
    "offensive_cards": 66,
    "defensive_cards": 10,
    "data_source": "card_images",
    "notes": "Extracted from actual card images"
  },
  "offensive_cards": {
    "Pro Style": {
      "Power Up Middle": {
        "roll_1": "Y-1",
        "roll_2": "Y-1",
        "roll_3": "Y+10",
        "roll_4": "Y+1",
        "roll_5": "Y+1",
        "roll_6": "Y+2",
        "roll_7": "Y+3",
        "roll_8": "Y+7",
        "roll_9": "Y+9",
        "roll_0": "Y+10"
      }
      // ... 21 more plays
    }
    // ... Ball Control and Aerial Style
  },
  "defensive_cards": {
    "Goal Line": {
      "description": "Heavy run defense with stacked box",
      "formation": "8-man front",
      "purpose": "Stop short-yardage situations"
    }
    // ... 9 more defensive cards
  },
  "discrepancies_found": [
    {
      "card": "Pro Style Power Up Middle",
      "field": "roll_1",
      "image_value": "Y-1",
      "data_file_value": "Y-2",
      "notes": "Card image shows -1, data file shows -2"
    }
    // ... other discrepancies
  ]
}
```

## Technical Requirements

### Image Analysis Capabilities Needed:
- **OCR/Text Recognition**: Extract text from card images
- **Layout Analysis**: Identify bottom section of cards containing results table
- **Pattern Recognition**: Distinguish between different card types and styles
- **Data Parsing**: Convert visual text to structured data format

### Error Handling:
- Handle cards with unclear text
- Flag cards that don't match expected format
- Note any ambiguities in text recognition
- Provide confidence scores for extracted data

### Quality Assurance:
- Cross-reference extracted data with existing data files
- Flag any discrepancies for manual review
- Ensure all expected cards are accounted for

## Deliverables

1. **Complete JSON file** with all extracted card data
2. **Discrepancy report** showing differences between card images and existing data files
3. **Summary report** of extraction process, including:
   - Number of cards processed
   - Cards with unclear data
   - Confidence levels for each extraction
   - Recommendations for data updates

## Success Criteria

- All 76 cards successfully processed
- Accurate extraction of roll outcomes from card bottoms
- Clear identification of data discrepancies
- JSON structure matches the specified format
- Comprehensive documentation of the extraction process

## Additional Context

This extraction is critical for ensuring data accuracy in the Gridiron Strategy game. The card images are the authoritative source, and any discrepancies with existing data files need to be identified and resolved. The extracted data will be used to update the game's chart data and ensure consistency between the visual cards and the game logic.
