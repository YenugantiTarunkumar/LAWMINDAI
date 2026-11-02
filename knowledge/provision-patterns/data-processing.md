# Provision Patterns: Data Processing Agreements

> Common provision patterns for Data Processing Agreements (DPAs) and data processing addenda, shown in both traditional (verbose/legalese) and improved (plain-language) versions.

---

## 1. Processing Instructions

### Traditional Version

> **Processing of Personal Data.** Processor shall process Personal Data solely on behalf of and in accordance with Controller's documented instructions. Processor shall not process Personal Data for any purpose other than as set forth in this Agreement or as otherwise instructed by Controller in writing. In the event that Processor believes that an instruction from Controller infringes applicable Data Protection Laws, Processor shall promptly notify Controller thereof and shall be entitled to suspend performance of the relevant processing activity until Controller modifies or confirms the instruction.

### Improved Version

> **1. Scope of Processing**
>
> Processor will process Personal Data only as Controller instructs. Controller's instructions are documented in Annex 1 (Processing Details).
>
> **2. No Other Processing**
>
> Processor will not process Personal Data for any purpose outside Controller's documented instructions, unless required by law. If law requires Processor to process Personal Data for another purpose, Processor will notify Controller before processing (unless the law prohibits that notification).
>
> **3. Conflicting Instructions**
>
> If Processor believes an instruction from Controller would violate data protection law, Processor will:
>
> 1. Notify Controller promptly.
> 2. Pause the relevant processing until Controller modifies or confirms the instruction.

**What changed:** Added explicit reference to an annex documenting processing details (a GDPR requirement often overlooked). Added the legal obligation exception (Article 28(3)(a) GDPR). Made the conflicting-instruction process a numbered sequence.

---

## 2. Sub-processor Obligations

### Traditional Version

> **Sub-processors.** Processor shall not engage any sub-processor to process Personal Data without the prior written consent of Controller. Processor shall provide Controller with a list of sub-processors currently engaged by Processor. Processor shall notify Controller of any intended changes concerning the addition or replacement of sub-processors, thereby giving Controller the opportunity to object to such changes. Processor shall impose on each sub-processor, by way of a written agreement, data protection obligations no less protective than those set forth in this Agreement. Processor shall remain fully liable to Controller for the performance of each sub-processor's obligations.

### Improved Version

> **1. Authorized Sub-processors**
>
> Processor's current sub-processors are listed in Annex 2. Controller approves those sub-processors by signing this Agreement.
>
> **2. Adding or Replacing Sub-processors**
>
> Before engaging a new sub-processor or replacing an existing one, Processor will:
>
> 1. Notify Controller at least 30 days in advance, including the sub-processor's name, location, and the processing it will perform.
> 2. Give Controller the opportunity to object.
>
> **3. Controller's Objection Right**
>
> If Controller objects to a new sub-processor within 30 days after receiving notice, the parties will discuss the objection in good faith. If the parties cannot resolve the objection within 15 days, Controller may terminate the data processing portions of this Agreement without penalty.
>
> **4. Sub-processor Contracts**
>
> Processor will enter a written agreement with each sub-processor that imposes data protection obligations at least as protective as those in this Agreement.
>
> **5. Liability**
>
> Processor is responsible for each sub-processor's compliance with this Agreement.

**What changed:** Added concrete timelines (30-day notice, 30-day objection window, 15-day resolution period). Specified what the notification must contain. Added a termination right if objections cannot be resolved. Referenced a sub-processor list annex.

---

## 3. Data Subject Rights

### Traditional Version

> **Data Subject Requests.** Taking into account the nature of the processing, Processor shall assist Controller by appropriate technical and organizational measures, insofar as this is possible, for the fulfillment of Controller's obligation to respond to requests for exercising the data subject's rights under applicable Data Protection Laws. In the event that Processor receives a request directly from a data subject, Processor shall promptly redirect such request to Controller and shall not respond to the data subject directly unless instructed to do so by Controller.

### Improved Version

> **1. Assisting with Data Subject Requests**
>
> Processor will help Controller respond to data subject requests (including requests to access, correct, delete, port, or restrict processing of Personal Data) by:
>
> 1. Providing tools or processes that allow Controller to retrieve, modify, or delete Personal Data.
> 2. Responding to Controller's reasonable assistance requests within 5 business days.
>
> **2. Direct Requests from Data Subjects**
>
> If a data subject contacts Processor directly:
>
> 1. Processor will redirect the request to Controller within 3 business days.
> 2. Processor will not respond to the data subject unless Controller instructs Processor to do so.
>
> **3. Costs**
>
> Processor will provide reasonable assistance at no additional charge. If a request requires significant effort beyond Processor's standard tools, Processor may charge Controller its reasonable costs after providing an estimate.

**What changed:** Enumerated the specific data subject rights. Added concrete response timelines. Addressed cost allocation (often missing from traditional DPAs, leading to disputes).

---

## 4. Security Measures

### Traditional Version

> **Security.** Processor shall implement and maintain appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including as appropriate: (a) the pseudonymization and encryption of Personal Data; (b) the ability to ensure the ongoing confidentiality, integrity, availability, and resilience of processing systems and services; (c) the ability to restore the availability and access to Personal Data in a timely manner in the event of a physical or technical incident; and (d) a process for regularly testing, assessing, and evaluating the effectiveness of technical and organizational measures for ensuring the security of the processing.

### Improved Version

> **1. Security Standards**
>
> Processor will implement and maintain technical and organizational security measures appropriate to the risk of processing. At a minimum, Processor will maintain the measures described in Annex 3 (Security Measures).
>
> **2. Required Measures**
>
> Processor's security program will include:
>
> 1. **Encryption**: Encryption of Personal Data in transit (TLS 1.2+) and at rest (AES-256 or equivalent).
> 2. **Access controls**: Role-based access controls, multi-factor authentication for administrative access, and least-privilege principles.
> 3. **Resilience**: Ability to restore access to Personal Data within 24 hours after a physical or technical incident.
> 4. **Testing**: Annual penetration testing and regular vulnerability assessments.
> 5. **Personnel**: Background checks and data protection training for employees who access Personal Data.
>
> **3. Audits**
>
> Once per year, Controller may audit Processor's compliance with this section. Processor will also provide:
>
> 1. A copy of its most recent SOC 2 Type II report (or equivalent) on request.
> 2. Responses to Controller's reasonable security questionnaires within 15 business days.

**What changed:** Added specific technical standards (encryption algorithms, TLS versions, recovery time objectives). Included audit rights with practical mechanisms (SOC 2 reports, questionnaires). Referenced a security annex for detailed measures.

---

## 5. Breach Notification

### Traditional Version

> **Personal Data Breach Notification.** Processor shall notify Controller without undue delay after becoming aware of a Personal Data Breach. Such notification shall include: (i) a description of the nature of the Personal Data Breach; (ii) the categories and approximate number of data subjects concerned; (iii) the likely consequences of the Personal Data Breach; and (iv) the measures taken or proposed to be taken to address the Personal Data Breach. Processor shall cooperate with Controller and take such commercially reasonable steps as may be directed by Controller to assist in the investigation, mitigation, and remediation of each such Personal Data Breach.

### Improved Version

> **1. Notification Timeline**
>
> Processor will notify Controller within 48 hours after Processor becomes aware of a Personal Data Breach.
>
> **2. Initial Notification**
>
> Processor's initial notification will include, to the extent known:
>
> 1. A description of the breach, including how it happened.
> 2. The types of Personal Data affected.
> 3. The estimated number of data subjects affected.
> 4. The likely consequences for affected data subjects.
> 5. Steps Processor has taken or plans to take to contain and remediate the breach.
> 6. A designated contact person for follow-up.
>
> **3. Follow-Up**
>
> If Processor cannot provide all information in the initial notification, Processor will provide updates as information becomes available, without unreasonable delay.
>
> **4. Cooperation**
>
> Processor will:
>
> 1. Cooperate with Controller's investigation of the breach.
> 2. Follow Controller's reasonable instructions to mitigate harm.
> 3. Preserve evidence related to the breach.
> 4. Not notify affected data subjects directly unless Controller requests it or law requires it.

**What changed:** Replaced "without undue delay" with a concrete 48-hour deadline. Added follow-up reporting obligation. Added evidence preservation. Clarified who communicates with data subjects. Added a contact-person requirement.

---

## 6. Cross-Border Transfers

### Traditional Version

> **International Transfers.** Processor shall not transfer Personal Data to any country or territory outside the European Economic Area ("EEA") without the prior written consent of Controller and unless adequate safeguards are in place in accordance with applicable Data Protection Laws. Where such transfers are made, the parties shall ensure that appropriate transfer mechanisms are implemented, including but not limited to Standard Contractual Clauses as approved by the European Commission, or reliance upon an adequacy decision.

### Improved Version

> **1. Transfer Restrictions**
>
> Processor will not transfer Personal Data outside the European Economic Area (EEA) unless:
>
> 1. The destination country has an adequacy decision from the European Commission; or
> 2. The parties have executed the EU Standard Contractual Clauses (attached as Annex 4); or
> 3. Another valid transfer mechanism under GDPR applies and Controller has approved it in writing.
>
> **2. Current Transfer Locations**
>
> Annex 1 lists the countries where Processor currently processes Personal Data. Processor will not add new transfer destinations without following the sub-processor notification process in Section 2.
>
> **3. Transfer Impact Assessment**
>
> Before transferring Personal Data to a new country, Processor will assess whether the destination country's laws provide adequate protection for Personal Data and will share the assessment with Controller on request.

**What changed:** Listed the valid transfer mechanisms explicitly (rather than "adequate safeguards" generally). Required a transfer impact assessment (reflecting post-Schrems II requirements). Tied new transfer locations to the sub-processor change process. Referenced specific annexes.

---

## 7. Return and Deletion

### Traditional Version

> **Return and Deletion of Data.** Upon termination or expiration of this Agreement, Processor shall, at the choice of Controller, return to Controller and/or securely delete all Personal Data processed on behalf of Controller, and shall certify in writing that it has done so, unless applicable law requires continued storage of the Personal Data.

### Improved Version

> **1. Controller's Choice**
>
> When this Agreement ends, Controller will instruct Processor to either:
>
> 1. Return all Personal Data to Controller in a standard, machine-readable format (e.g., CSV, JSON); or
> 2. Delete all Personal Data from Processor's systems.
>
> **2. Timeline**
>
> Processor will complete the return or deletion within 30 days after receiving Controller's instructions.
>
> **3. Certification**
>
> After completing deletion, Processor will send Controller a written certification confirming that all Personal Data has been deleted, including from backups (within the normal backup rotation cycle, up to 90 days).
>
> **4. Legal Holds**
>
> If applicable law requires Processor to retain any Personal Data after this Agreement ends, Processor will:
>
> 1. Notify Controller of the retention requirement and the specific data retained.
> 2. Continue to protect the retained data under the terms of this Agreement.
> 3. Delete the retained data as soon as the legal requirement expires.

**What changed:** Specified data return format. Added concrete timelines for deletion. Addressed backup retention (a practical reality often ignored). Added specifics for legal hold situations.

---

*These patterns reflect common GDPR-aligned DPA provisions. Adapt them for your specific regulatory requirements, data flows, and processing activities.*
