# 🛡️ c-stamper
**Cryptographic Static Stamp Generator for Document Authentication**

*Copyright (c) 2026 Hiroshi Takey F. <htakey@gmail.com> All rights reserved*

## ⚙️ Technical Architecture
The core system implements a one-way encryption flow to guarantee authenticity without the need for external databases:

1. **Input:** Concatenation of Date (`YYYY-MM-DD`) + `Secret_Salt`.
2. **Hashing:** Processing via the **SHA-256** algorithm.
3. **Mapping:** Truncation and conversion of the hexadecimal hash into a **4x4 Binary Matrix**.
4. **Output:** Visual rendering for physical stamping or digital verification.

$$Hash = SHA256(Date + PrivateSalt)$$

## 🚀 Key Features
* **Deterministic Generation:** The same stamp is always generated for a specific date and key, allowing for reliable subsequent validation.
* **Security via Salt:** The inclusion of a private master key prevents third parties from replicating valid stamps.
* **Zero Dependencies:** Built with Vanilla JavaScript (ES6+), HTML5, and CSS3. No external modules required.

## 📂 Project Structure
* `index_generator.html`: User interface and rendering engine.
* `style_generator.css`: Aesthetic layer and visual matrix structure.
* `script_generator.js`: Encryption logic and bit manipulation (Core).

## 🔧 Installation & Configuration
1. Clone this repository:
   ```bash
   git clone [https://github.com/hiro2233/c-stamper.git](https://github.com/hiro2233/c-stamper.git)

2. Configure your Private Salt within the script_generator.js file to personalize your unique cryptographic signature.

3. Open index_generator.html in any modern web browser.
