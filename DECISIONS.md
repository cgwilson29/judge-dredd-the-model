# Decisions

<!-- Fill in each section at the step the activity website gives, then commit and push.
     Write each answer after its label. Keep the headings and labels exactly as they are:
     `python -m analysis` reads them. Limit: 150 words for Before results.
     Fill in Recommendations and Design choice and AI use last, once your app is built. -->

## Before results
For each dataset: positive class; which error matters more for the job (missed positive or false alarm) and why.
- readmission: The positive class is column 'target' which identifies 30-day readmission for each patient contained within the dataset. 'target' == 1 indicates that the patient was readmitted within 30 days of discharge. For this target, a missed positive error will matter more, as this would indicate that any predicted outcome of 0 that is acutally an outcome of 1 results in a preventable hospital readmission, increased morbidity, and healthsystem costs. A false alarm error would not be as costly, as additional frontend monitoring or itnerventional costs to prevent readmission would be outweighed by a hosptial readmission.
- diabetes: The positive class is 'target' which identifies whether a patient was either told by their doctor they have diabetes, OR the patient has a HbA1c of >/= 6.5%, indicated in the data set as 'target' == 1. A 'target' == 0 indicates that the patient HbA1c is below 6.5% AND the doctor did not tell the patient they have diabetes. For this target, a false alarm would matter more. A patient who is incorrectly labeled as having diabetes may be at increased risk of unnecessary healthcare costs, testing, or medication initiation which could lead to life threatening hypoglycemia or death. A missed positive could result in failure to manage diabetes in a patient, however the overall costs likely would be less detrimental compared to a false alarm.

## Recommendations
- readmission: <model and threshold, or "none is adequate for this job"> because ...
- diabetes: ...

## Design choice and AI use
A few sentences each. The design choice must be your own idea, not an AI tool's.
- design choice: <one thing you chose to show, or leave out, for your clinical lead> because ...
- AI suggestion I turned down: <what an AI tool suggested, and why you didn't use it, or "no AI tools used">
