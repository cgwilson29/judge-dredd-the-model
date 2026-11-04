# Decisions

<!-- Fill in each section at the step the activity website gives, then commit and push.
     Write each answer after its label. Keep the headings and labels exactly as they are:
     `python -m analysis` reads them. Limit: 150 words for Before results.
     Fill in Recommendations and Design choice and AI use last, once your app is built. -->

## Before results
For each dataset: positive class; which error matters more for the job (missed positive or false alarm) and why.
- readmission: The positive class is column 'target' identifying 30-day readmission for each patient. 1 indicates the patient was readmitted within 30 days of discharge. A missed positive error will matter more, as this would indicate that any predicted outcome of 0 that is acutally an outcome of 1 results in a preventable hospital readmission, increased morbidity, and costs. Additional monitoring or itnerventional costs to prevent readmission of a missed false alarm would be outweighed by a hosptial readmission.
- diabetes: The positive class is 'target' which identifies whether a patient was either told by their doctor they have diabetes, OR the patient has a HbA1c of >/= 6.5%, as 'target' == 1. A 'target' == 0 indicates that the patient HbA1c is below 6.5% AND the doctor did not tell the patient they have diabetes. A false alarm would matter more: a patient incorrectly labeled as having diabetes may be at increased risk of unnecessary healthcare costs, testing, or medication initiation which could lead to life threatening hypoglycemia or death. A missed positive could result in failure to manage diabetes in a patient, but overall costs are likely less detrimental.

## Recommendations
- readmission: No models are adequate for this job because all models rank the patients poorly, as indicated by AUROC of between 0.583 and 0.651 for test data and 0.657 to 0.997 for training data, with the widest variation in training to test AUROCs having a gap of approximately 0.3, suggesting the models memorized the data. No threshold tested fixes the misleading accuracy scores, where even at low thresholds of 0.05 to 0.15, the models flag only 22-36% of every 100 patients, however the precision is abysmally low at around 15%, as compared to a 9% base rate.
- diabetes: Logistic regression with a threshold of 0.12 is the best model for this data, as it has the highest test AUROC (on unseen data) at 0.827, maintaining a sensitivity of >/= 90%/ At a threshold of 0.5, only about 30% of positive patients are caught, whereas at 0.12, the model catches 180 of 200 patients, with the fewest false alarms.

## Design choice and AI use
A few sentences each. The design choice must be your own idea, not an AI tool's.
- design choice: Prominently display the number of actual positive cases the model misses at the current threshold, with a short clinical interpretation. This matters because (for readmission), missed high-risk patients may not receive additional discharge planning or follow-up, and (for diabetes) missed cases may delay further evaluation or confirmatory testing. A Clinical lead should be able to quickly understand what the model fails to identify, not jsut its successful predictions.
- AI suggestion I turned down: Recommend deploying the highest-performing readmission model without considering the number of patients flagged for follow-up because predictive performance alone does not establish operational feasibility; the clinical lead must understand the expected workload and whether the additional identification of patients justifies that burden.
