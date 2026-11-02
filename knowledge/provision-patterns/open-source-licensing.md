# Provision Patterns: Open Source Licensing

> Common provision patterns for open source license grants, attribution, copyleft, and patent provisions, shown in both traditional (verbose) and improved (plain-language) versions.

---

## 1. License Grant Structures

### Traditional Version (Permissive)

> **License Grant.** Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license to reproduce, prepare derivative works of, publicly display, publicly perform, sublicense, and distribute the Work and such derivative works in Source or Object form.

### Improved Version (Permissive)

> **1. Copyright License**
>
> Each Contributor grants You a free, perpetual, worldwide, non-exclusive, irrevocable license to:
>
> 1. Use, copy, and distribute the Work.
> 2. Create and distribute derivative works based on the Work.
> 3. Publicly display and perform the Work.
> 4. Sublicense these rights to others.
>
> This license applies to the Work in both source code and compiled forms.
>
> **2. No Fees**
>
> This license is royalty-free. You do not owe Contributors any payment for exercising these rights.

**What changed:** Broke the single dense sentence into a numbered list of specific rights. Separated the no-fee aspect into its own section. Made "source or object form" more accessible with "source code and compiled forms."

---

### Traditional Version (Copyleft)

> **License Grant.** The Program is licensed to You under the terms of this License. You may copy, distribute, and modify the Program, provided that You distribute the Program and any derivative works thereof under this same License. You may not impose any further restrictions on the exercise of the rights granted herein. You must cause any work that You distribute or publish, that in whole or in part contains or is derived from the Program or any part thereof, to be licensed as a whole at no charge to all third parties under the terms of this License.

### Improved Version (Copyleft)

> **1. What You Can Do**
>
> You may use, copy, modify, and distribute the Program, provided you follow the conditions below.
>
> **2. Share-Alike Condition**
>
> If you distribute the Program or any work based on it, you must:
>
> 1. License the entire work under this same license.
> 2. Make the complete source code available.
> 3. Not add restrictions beyond those in this license.
> 4. Include this license text with every copy.
>
> **3. What "Based On" Means**
>
> A work is "based on" the Program if it contains Program code, or if it could not function without the Program. Merely using the Program as a tool to create independent content does not make that content "based on" the Program.

**What changed:** Separated the grant from the conditions. Named the copyleft condition plainly ("Share-Alike Condition"). Added a definition of "based on" to help users understand when copyleft triggers — the single most common source of confusion with copyleft licenses.

---

## 2. Attribution Requirements

### Traditional Version

> **Attribution.** Redistributions of the Work in source code form must retain the above copyright notice, this list of conditions, and the following disclaimer in all copies or substantial portions of the Work. Redistributions in binary form must reproduce the above copyright notice, this list of conditions, and the following disclaimer in the documentation and/or other materials provided with the distribution. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this Work without specific prior written permission.

### Improved Version

> **1. What You Must Include**
>
> When you distribute copies of the Work, include the following in every copy:
>
> 1. The original copyright notice.
> 2. This license text.
> 3. The disclaimer of warranties.
>
> **2. Source vs. Compiled Distribution**
>
> - **Source code**: Include the items above in the source files.
> - **Compiled/binary form**: Include the items above in the documentation or materials you distribute with the compiled code.
>
> **3. No Endorsement**
>
> You may not use the names of the copyright holder or contributors to endorse or promote products derived from this Work without their written permission.

**What changed:** Separated source and binary requirements into their own section. Made the endorsement restriction its own visible section. Listed the three specific things that must be included.

---

## 3. Copyleft Obligations

### Traditional Version

> **Copyleft and Derivative Works.** You must cause any modified files to carry prominent notices stating that You changed the files and the date of any change. You must cause any work that You distribute or publish, that in whole or in part contains or is derived from the Program or any part thereof, to be licensed as a whole at no charge to all third parties under the terms of this License. If the modified program normally reads commands interactively when run, You must cause it, when started running for such interactive use in the most ordinary way, to print or display an announcement including an appropriate copyright notice.

### Improved Version

> **1. Modification Notices**
>
> If you modify the Work, you must:
>
> 1. Add a notice to each modified file stating that you changed it and the date of the change.
> 2. Keep all existing copyright notices and license references intact.
>
> **2. Distribution of Modified Versions**
>
> If you distribute a modified version of the Work, you must:
>
> 1. License the modified version under this same license.
> 2. Make the complete source code of the modified version available.
> 3. Not charge a licensing fee (you may charge for distribution or support).
>
> **3. Interactive Programs**
>
> If the modified program has an interactive user interface, it must display:
>
> 1. The original copyright notice.
> 2. A notice that there is no warranty (unless you provide one).
> 3. A reference to this license.
>
> **4. What Triggers Copyleft**
>
> Copyleft applies when you **distribute** modified versions. It does not apply to:
>
> 1. Private modifications you use only within your own organization.
> 2. Running the unmodified program on your own servers (unless this is an AGPL-licensed work).

**What changed:** Added a critical clarification about what triggers copyleft (distribution vs. private use). Separated modification notices from distribution requirements. Clarified that charging for distribution is permitted even though licensing fees are not. Noted the AGPL distinction.

---

## 4. Patent Grants

### Traditional Version

> **Patent License.** Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable (except as stated in this section) patent license to make, have made, use, offer to sell, sell, import, and otherwise transfer the Work, where such license applies only to those patent claims licensable by such Contributor that are necessarily infringed by their Contribution(s) alone or by combination of their Contribution(s) with the Work to which such Contribution(s) was submitted. If You institute patent litigation against any entity (including a cross-claim or counterclaim in a lawsuit) alleging that the Work constitutes direct or contributory patent infringement, then any patent licenses granted to You under this License for that Work shall terminate as of the date such litigation is filed.

### Improved Version

> **1. Patent License**
>
> Each Contributor grants You a free, perpetual, worldwide, non-exclusive, irrevocable patent license to make, use, sell, import, and otherwise transfer the Work — but only for patents that the Contributor's code necessarily infringes.
>
> **2. Scope of Patent Grant**
>
> This patent license covers:
>
> 1. Patents infringed by a Contributor's code alone.
> 2. Patents infringed by a Contributor's code combined with the rest of the Work.
>
> It does not cover patents infringed only by code someone else wrote, or by your modifications.
>
> **3. Patent Retaliation**
>
> If you sue anyone claiming that the Work infringes a patent, your patent license under this license terminates immediately.
>
> **4. Why This Matters**
>
> The patent grant protects you from being sued by Contributors for using their code. The retaliation clause prevents you from using the code and then turning around and suing others over it.

**What changed:** Added a "Why This Matters" section — patent grants are the least-understood part of open source licenses. Broke the scope into concrete examples. Named the retaliation clause explicitly. Clarified what the patent grant does *not* cover.

---

## 5. Warranty Disclaimers

### Traditional Version

> **Disclaimer of Warranty.** THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### Improved Version

> **1. No Warranty**
>
> The Work is provided "as is," without any warranty. Contributors do not warrant that the Work will be error-free, secure, or fit for any particular purpose.
>
> **2. Your Risk**
>
> You use the Work at your own risk. Contributors are not liable for any damages arising from your use of the Work, including direct, indirect, incidental, or consequential damages.
>
> **3. What This Means Practically**
>
> - If the Work has a bug, you are responsible for fixing it or finding a workaround.
> - If the Work causes data loss, Contributors are not liable.
> - If you need a warranty, negotiate a separate commercial support agreement with the Contributors.

**What changed:** Removed ALL-CAPS formatting. Added a practical explanation of what the disclaimer means for users. Suggested commercial support as the path to get warranty coverage.

---

## 6. License Compatibility and Combining Works

### Traditional Version

*(This provision type is rarely found in licenses themselves but is critical for compliance.)*

### Improved Version

> **1. Combining Licensed Works**
>
> When combining this Work with other licensed software, check compatibility:
>
> | This License | Can combine with | Resulting license |
> |---|---|---|
> | MIT | Any license | Other license's terms apply to combined work |
> | Apache 2.0 | MIT, BSD, LGPL, GPL v3 | Apache 2.0 (or GPL v3 if GPL component present) |
> | GPL v2 | GPL v2, LGPL v2.1 | GPL v2 |
> | GPL v3 | GPL v3, LGPL v3, Apache 2.0, MIT, BSD | GPL v3 |
> | AGPL v3 | GPL v3, LGPL v3, Apache 2.0, MIT, BSD | AGPL v3 |
>
> **2. Key Compatibility Rules**
>
> 1. Permissive licenses (MIT, BSD, Apache 2.0) can generally be combined with any other license.
> 2. Copyleft licenses (GPL, AGPL) require the combined work to use the copyleft license.
> 3. GPL v2 and Apache 2.0 are not directly compatible — use GPL v3 or "GPL v2 or later" to resolve.
> 4. AGPL adds a network-use trigger: if users interact with the software over a network, source code must be made available.
>
> **3. When In Doubt**
>
> If license compatibility is unclear, consult with legal counsel before distributing the combined work. Getting compatibility wrong can create significant legal exposure.

**What changed:** This is a new provision type not found in traditional licenses — it addresses the practical compliance question that developers most frequently face.

---

*Open source licensing is a nuanced area. These patterns are educational summaries, not legal advice. Always review the full text of the applicable license.*
