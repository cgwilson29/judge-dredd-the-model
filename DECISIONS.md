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
- readmission: <model and threshold, or "none is adequate for this job"> because ...
- diabetes: ...

## Design choice and AI use
A few sentences each. The design choice must be your own idea, not an AI tool's.
- design choice: <one thing you chose to show, or leave out, for your clinical lead> because ...
- AI suggestion I turned down: <what an AI tool suggested, and why you didn't use it, or "no AI tools used">
