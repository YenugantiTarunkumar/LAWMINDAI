# Provision Patterns: SaaS Agreements

> Common provision patterns for Software-as-a-Service agreements, shown in both traditional (verbose/legalese) and improved (plain-language) versions.

---

## 1. Service Level Commitments

### Traditional Version

> **Service Level Agreement.** Provider shall use commercially reasonable efforts to make the Service Available (as defined below) at least 99.9% of the time during each calendar month (the "Uptime Commitment"). "Service Available" or "Availability" shall mean that the Service is operational and accessible via the internet, excluding: (i) planned maintenance windows of which Customer has been given not less than forty-eight (48) hours' prior written notice; (ii) force majeure events as described in Section 12.4; (iii) failures resulting from Customer's equipment, software, or network connections; and (iv) any period during which the Service is unavailable as a result of actions or inactions of Customer or its authorized users. In the event that Provider fails to meet the Uptime Commitment in any given calendar month, Customer shall be entitled to a service credit equal to the applicable percentage set forth in the table below, which credit shall be applied against the fees due for the subsequent billing period and which shall constitute Customer's sole and exclusive remedy for Provider's failure to meet the Uptime Commitment.

### Improved Version

> **1. Uptime Commitment**
>
> Provider will keep the Service available at least 99.9% of the time each calendar month.
>
> **2. What Counts as Downtime**
>
> Downtime means any period when the Service is not operational and accessible over the internet, excluding:
>
> 1. Planned maintenance that Provider announces at least 48 hours in advance.
> 2. Force majeure events (Section 10).
> 3. Issues caused by Customer's equipment, software, or network.
> 4. Outages caused by Customer's actions.
>
> **3. Service Credits**
>
> If Provider misses the 99.9% target in a calendar month, Customer will receive a credit against the next month's fees:
>
> | Monthly Uptime | Credit (% of monthly fee) |
> |---|---|
> | 99.0% – 99.9% | 10% |
> | 95.0% – 99.0% | 25% |
> | Below 95.0% | 50% |
>
> **4. How to Claim Credits**
>
> Customer must request credits in writing within 30 days after the month in which downtime occurred. Service credits are Customer's only remedy for downtime.

**What changed:** Broke a single wall-of-text paragraph into four discrete sections. Replaced "shall" with "will." Removed "commercially reasonable efforts" qualification (if the target is 99.9%, that *is* the standard). Added a clear credit table. Created a simple claim procedure.

---

## 2. Subscription Terms

### Traditional Version

> **Term; Renewal.** The initial term of this Agreement shall commence on the Effective Date and shall continue for a period of twelve (12) months (the "Initial Term"). Thereafter, this Agreement shall automatically renew for successive periods of twelve (12) months each (each, a "Renewal Term" and, together with the Initial Term, the "Term"), unless either party provides written notice of non-renewal to the other party not less than sixty (60) days prior to the expiration of the then-current Term. Either party may terminate this Agreement for convenience upon not less than thirty (30) days' prior written notice to the other party; provided, however, that in the event of termination by Customer for convenience during the Initial Term, Customer shall remain liable for all fees due and owing for the remainder of the Initial Term.

### Improved Version

> **1. Initial Term**
>
> This Agreement starts on the Effective Date and lasts for 12 months (the "Initial Term").
>
> **2. Renewal**
>
> After the Initial Term, this Agreement automatically renews for additional 12-month periods (each a "Renewal Term") unless either party gives the other written notice at least 60 days before the current term ends.
>
> **3. Termination for Convenience**
>
> Either party may end this Agreement for any reason by giving the other party 30 days' written notice.
>
> **4. Early Termination Fees**
>
> If Customer ends this Agreement during the Initial Term, Customer will pay the remaining fees for the rest of the Initial Term.

**What changed:** Split one dense paragraph into four sections. Used digits instead of spelled-out numbers with parentheticals. Replaced "shall" with "will." Made the early termination fee consequence its own visible section.

---

## 3. Data Handling and Security

### Traditional Version

> **Data Security.** Provider shall implement and maintain throughout the Term of this Agreement administrative, physical, and technical safeguards that are no less protective than those described in the Security Exhibit attached hereto as Exhibit B, and which are designed to: (a) ensure the security and confidentiality of Customer Data; (b) protect against any anticipated threats or hazards to the security or integrity of Customer Data; and (c) protect against unauthorized access to or use of Customer Data. Provider shall notify Customer without unreasonable delay, and in any event within seventy-two (72) hours, of any Security Incident (as defined herein). "Security Incident" shall mean any unauthorized access to, acquisition of, use of, or disclosure of Customer Data.

### Improved Version

> **1. Security Standards**
>
> Provider will maintain administrative, physical, and technical security measures that meet or exceed the standards described in Exhibit B throughout this Agreement.
>
> **2. Security Goals**
>
> Provider's security measures will:
>
> 1. Protect the confidentiality and integrity of Customer Data.
> 2. Guard against anticipated threats to Customer Data.
> 3. Prevent unauthorized access to or use of Customer Data.
>
> **3. Breach Notification**
>
> "Security Incident" means any unauthorized access to, acquisition of, use of, or disclosure of Customer Data.
>
> If a Security Incident occurs, Provider will notify Customer within 72 hours after Provider becomes aware of it.
>
> **4. Incident Response**
>
> Provider's notification will include:
>
> 1. A description of the incident.
> 2. The type and estimated volume of data affected.
> 3. Steps Provider is taking to contain and remediate the incident.
> 4. A contact person for follow-up questions.

**What changed:** Broke into discrete sections. Moved the definition of "Security Incident" next to its first use. Added an incident response section specifying what the notification must contain (the traditional version just says "notify" without specifying content). Changed "without unreasonable delay" to a concrete 72-hour deadline.

---

## 4. Limitation of Liability

### Traditional Version

> **Limitation of Liability.** IN NO EVENT SHALL EITHER PARTY BE LIABLE TO THE OTHER PARTY FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES (EVEN IF SUCH PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES), ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT. EXCEPT FOR THE OBLIGATIONS SET FORTH IN SECTIONS 6 (INDEMNIFICATION) AND 7 (CONFIDENTIALITY), IN NO EVENT SHALL EITHER PARTY'S AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT EXCEED THE TOTAL AMOUNTS PAID OR PAYABLE BY CUSTOMER TO PROVIDER DURING THE TWELVE (12) MONTH PERIOD IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.

### Improved Version

> **1. No Indirect Damages**
>
> Neither party will be liable to the other for indirect, incidental, consequential, special, or punitive damages — including lost profits, lost data, or business interruption — even if that party knew those damages were possible.
>
> **2. Liability Cap**
>
> Each party's total liability under this Agreement will not exceed the fees Customer paid to Provider in the 12 months before the claim arose.
>
> **3. Exceptions**
>
> The limits in Sections 1 and 2 above do not apply to:
>
> 1. Either party's indemnification obligations (Section 8).
> 2. Either party's breach of confidentiality obligations (Section 7).
> 3. Either party's willful misconduct or fraud.
> 4. Customer's obligation to pay fees owed under this Agreement.

**What changed:** Removed ALL-CAPS formatting (which is no longer required in most U.S. jurisdictions for conspicuousness — bold headings achieve the same effect). Split into three clear sections. Made the carve-outs visible as a numbered list. Used "fees Customer paid" instead of "amounts paid or payable."

---

## 5. Intellectual Property

### Traditional Version

> **Intellectual Property Rights.** As between the parties, Provider shall own and retain all right, title, and interest in and to the Service, including all software, technology, algorithms, user interfaces, and documentation, and all intellectual property rights therein and thereto. Customer shall own and retain all right, title, and interest in and to all Customer Data. Provider hereby grants to Customer a non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the Service during the Term solely for Customer's internal business purposes in accordance with this Agreement. Nothing in this Agreement shall be construed to transfer any intellectual property rights from one party to the other except as expressly stated herein.

### Improved Version

> **1. Provider's IP**
>
> Provider owns the Service, including its software, technology, algorithms, interfaces, and documentation.
>
> **2. Customer's Data**
>
> Customer owns all Customer Data. This Agreement does not transfer ownership of Customer Data to Provider.
>
> **3. License to Use the Service**
>
> Provider grants Customer a non-exclusive, non-transferable license to access and use the Service during the term of this Agreement for Customer's internal business purposes.
>
> **4. No Other IP Transfer**
>
> This Agreement does not transfer any other intellectual property rights between the parties.

**What changed:** Removed "right, title, and interest" boilerplate (ownership is ownership). Removed "non-sublicensable, revocable" from the license grant — these are separate decisions that should be made intentionally, not buried in a list. Split IP ownership into clear, scannable sections.

---

## 6. Warranties

### Traditional Version

> **Warranties.** Provider represents and warrants that: (a) it has the legal power and authority to enter into this Agreement; (b) the Service will perform materially in accordance with the Documentation; (c) the Service will not infringe upon or misappropriate any third party's intellectual property rights; and (d) the Service will comply in all material respects with applicable laws and regulations. THE FOREGOING WARRANTIES ARE THE SOLE AND EXCLUSIVE WARRANTIES PROVIDED BY PROVIDER. EXCEPT AS EXPRESSLY SET FORTH HEREIN, THE SERVICE IS PROVIDED "AS IS" AND PROVIDER HEREBY DISCLAIMS ALL OTHER WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

### Improved Version

> **1. Provider's Warranties**
>
> Provider warrants that:
>
> 1. Provider has the authority to enter into this Agreement.
> 2. The Service will perform materially as described in the Documentation.
> 3. The Service will not infringe any third party's intellectual property rights.
> 4. The Service will comply with applicable laws in all material respects.
>
> **2. Warranty Disclaimer**
>
> Except for the warranties in Section 1 above, Provider provides the Service "as is" without any other warranties, including implied warranties of merchantability or fitness for a particular purpose.
>
> **3. Warranty Remedy**
>
> If the Service breaches a warranty in Section 1, Customer's remedy is:
>
> 1. Provider will use reasonable efforts to correct the non-conformity within 30 days after Customer reports it.
> 2. If Provider cannot correct the non-conformity within 30 days, Customer may terminate this Agreement and receive a pro-rata refund of prepaid fees.

**What changed:** Broke the warranty list into a numbered format. Removed ALL-CAPS disclaimer. Added a warranty remedy section (the traditional version disclaimed all remedies without specifying what remedy *does* exist — leaving a gap).

---

*These patterns are starting points. Adapt them to your specific transaction, risk profile, and jurisdiction.*
