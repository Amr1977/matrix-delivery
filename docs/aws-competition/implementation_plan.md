# Matrix AI - Implementation Plan (Synthetic Data Strategy)

Since the platform hasn't launched, we must generate **synthetic data** to train our AWS AI models. This allows us to demonstrate a working "Pre-trained" system for the competition.

## 1. Synthetic Data Generation Script

We will create a script `scripts/generate_synthetic_data.js` to seed the database (or directly create CSVs) with realistic-looking patterns:

- **Demand Profiles:** Create "morning rush" and "dinner rush" spikes in specific zones.
- **Driver Behaviors:** Create "reliable" and "unreliable" driver profiles for the matching engine to learn from.
- **Fraud Patterns:** Inject known fraud patterns (e.g., high-value orders from new devices) for the detector to catch.

## 2. AWS Service Setup (Free Tier)

- **S3 Bucket:** Create a bucket `matrix-ai-data` to hold our CSVs.
- **Amazon Forecast:** Upload demand CSV -> Train "DemandPredictor".
- **Amazon Personalize:** Upload interaction CSV -> Train "DriverRecommender".

## 3. Demo Mode

- The app will switch to "Demo Mode" where it queries these pre-trained models, showing "Predicted High Demand" on the map based on our synthetic future data.

## Next Step

- Write `scripts/generate_synthetic_data.js` to create 1 year of fake order history.
