const Proxy = {

    acceptedKey: "blurProxyDisclaimerAccepted",

    load() {

        const panel = document.querySelector(
            '[data-panel="proxy"]'
        );

        if (localStorage.getItem(this.acceptedKey) === "true") {

            this.loadProxy(panel);
            return;

        }

        panel.innerHTML = `

<div class="proxy-disclaimer">

    <div class="proxy-agreement">

        <div class="proxy-agreement-header">
            <h1>Before You Continue</h1>

            <p>
                Please read this agreement before using Blur Browser.
            </p>

        </div>

        <section>

            <h3>Your Responsibility</h3>

            <p>
                Blur Browser is provided as a general-purpose web browsing tool. By continuing, you acknowledge that you are solely responsible for how you choose to use it. Every website you visit, every account you sign into, every file you download, and every action you perform through the browser is your own decision and responsibility. You agree to use Blur in accordance with all applicable laws, regulations, and the policies that apply to your school, workplace, organization, or internet provider.
            </p>

        </section>

        <section>

            <h3>Acceptable Use</h3>

            <p>
                Blur is not intended to encourage or support unlawful, harmful, or unethical behavior. You agree not to use the browser to violate laws, infringe on copyrights, bypass rules that apply to you, distribute malicious software, harass others, attempt unauthorized access to systems, or engage in any activity that could harm individuals, organizations, or networks. You understand that your actions remain your responsibility regardless of the technology used to access the internet.
            </p>

        </section>

        <section>

            <h3>Liability</h3>

            <p>
                By continuing, you acknowledge that the creators, contributors, maintainers, and anyone associated with Blur are not responsible for the consequences of your individual actions while using the browser. Except where liability cannot legally be limited or where damage is directly caused by the developers' own misconduct or negligence, you agree that the developers are not responsible for disciplinary action, account suspensions, blocked access, data loss, legal consequences, or any damages resulting from your personal use of Blur.
            </p>

        </section>

        <section>

            <h3>Internet Content</h3>

            <p>
                The internet contains content that may be inaccurate, misleading, offensive, malicious, or otherwise unsuitable. You understand that browsing the web carries inherent risks, including phishing attempts, malware, inappropriate material, and fraudulent websites. You accept responsibility for exercising good judgment while using Blur and understand that the developers cannot review or control the content made available through third-party websites.
            </p>

        </section>

        <section>
            <h3>Third-Party Services &amp; Accounts</h3>
            <p>Blur does not control the websites you open through the Browser. Their content, availability, terms, cookies, tracking, and privacy practices are governed by those third parties. If you sign into an outside account, submit information, download a file, or follow a link, that interaction is between you and the third party.</p>
        </section>

        <section>
            <h3>Information &amp; Local Storage</h3>
            <p>Blur is designed to minimize data collection. Browser preferences and other application settings may be stored locally in your browser. The sites you visit may independently collect information through their own systems, and anything you enter into a third-party site may be processed under that site's policy.</p>
            <p>You can clear applicable local Blur data through Settings or your browser controls. Clearing local data may remove preferences and other on-device state.</p>
        </section>

        <section>
            <h3>Safety, Downloads &amp; Security</h3>
            <p>No browser can guarantee that third-party content is accurate or safe. Watch for phishing, malware, fraudulent downloads, deceptive permissions, and inappropriate content. Keep your device and accounts protected, verify downloads before opening them, and follow the rules of your school, workplace, organization, and internet provider.</p>
        </section>

        <section>
            <h3>Availability &amp; Changes</h3>
            <p>Blur Browser may be changed, interrupted, limited, or discontinued without notice. We may update this agreement as the Browser and its supporting services change. The Legal and Privacy documents provide additional information about Blur's service, data practices, and your choices.</p>
        </section>

        <section>

            <h3>Your Agreement</h3>

            <p>
                By selecting <strong>"I Accept"</strong>, you confirm that you have read and understood this agreement. You acknowledge that you accept full responsibility for your own actions while using Blur Browser and understand that this notice is intended to ensure users recognize their personal responsibility before accessing the integrated browser.
            </p>

        </section>

        <div class="proxy-actions">

            <button class="proxy-cancel ui-button ui-button--quiet">
                Cancel
            </button>

            <button class="proxy-accept ui-button ui-button--primary">
                I Accept
            </button>

        </div>

        <p class="proxy-legal-links">Read the <a href="#" data-tab="legal">Terms</a> and <a href="#" data-tab="privacy">Privacy Policy</a>.</p>

    </div>

</div>

        `;

        panel.querySelector(".proxy-accept").onclick = () => {

            localStorage.setItem(
                this.acceptedKey,
                "true"
            );

            this.loadProxy(panel);

        };

        panel.querySelector(".proxy-cancel").onclick = () => {

            document.querySelector(
                '[data-tab="home"]'
            ).click();

        };

    },

loadProxy(panel) {

    panel.innerHTML = `

    <div class="browser-wip">

        <div class="browser-wip-icon">
            <svg viewBox="0 0 24 24">
                <path d="M12 6v6l4 2"/>
                <circle cx="12" cy="12" r="9"/>
            </svg>
        </div>

        <h2>Blur Browser</h2>

        <p>
            This feature is currently being redesigned
            or has been discontinued.
        </p>

    </div>

    `;

}

};

Proxy.load();
