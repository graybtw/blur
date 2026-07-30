const legalData = {

    legal: {

        title: "Legal",

        subtitle: "Terms, rules, and information about using Blur.",

        content: `

        <div class="doc-content">


<section>

    <h3>Terms of Service</h3>

    <p>
        Welcome to Blur. By accessing or using Blur, you agree
        to use the platform responsibly and accept responsibility
        for your own activity.
    </p>

    <p>
        Blur does not encourage or support any illegal, harmful,
        or unauthorized use of its features. Users are expected
        to make appropriate decisions when using the service.
    </p>

</section>



<section>

    <h3>User Responsibilities</h3>

    <p>
        Users are responsible for how they access and use Blur.
        By using the platform, you agree to follow all applicable
        laws, rules, and regulations.
    </p>

    <p>
        Blur provides tools and features for entertainment and
        general use. Users are responsible for their own actions
        while using these features.
    </p>

    <p>
        Blur is not responsible for any consequences, penalties,
        account restrictions, or legal issues that may occur due
        to how a user chooses to use the platform.
    </p>

</section>



            <section>

                <h3>Third Party Content</h3>

                <p>
                    Blur may include links, integrations, or content provided
                    by third-party services. Blur is not responsible for the
                    availability or accuracy of external services.
                </p>

            </section>



            <section>

                <h3>Updates</h3>

                <p>
                    These terms may change as Blur grows. Continued use of
                    Blur after changes means you accept the updated terms.
                </p>

            </section>


        </div>

        `
    },



    dmca: {

        title: "DMCA",

        subtitle: "Copyright protection and removal requests.",

        content: `

        <div class="doc-content">


            <section>

                <h3>Copyright Policy</h3>

                <p>
                    Blur respects the rights of creators, developers,
                    and copyright owners. We take copyright concerns
                    seriously and aim to respond to valid requests.
                </p>

            </section>



            <section>

                <h3>Reporting Content</h3>

                <p>
                    If you believe content available through Blur violates
                    your copyright, you may submit a request for review.
                    Requests should include enough information to identify
                    the copyrighted material and explain your ownership.
                </p>

                <p>
                    Incomplete or inaccurate reports may delay the review
                    process.
                </p>

            </section>



            <section>

                <h3>Review Process</h3>

                <p>
                    Submitted reports are reviewed and appropriate action
                    may be taken depending on the situation.
                </p>

            </section>



            <section>

                <h3>Contact</h3>

                <p>
                    Copyright-related concerns can be sent through the
                    official Blur contact channels.
                </p>

            </section>


        </div>

        `
    },



    privacy: {

        title: "Privacy",

        subtitle: "Information about data and privacy.",

        content: `

        <div class="doc-content">


            <section>

                <h3>Your Privacy</h3>

                <p>
                    Blur is designed with privacy in mind. We aim to limit
                    the information collected and only use information
                    necessary to provide and improve the service.
                </p>

            </section>



            <section>

                <h3>Information Collection</h3>

                <p>
                    Depending on the features you use, Blur may process
                    information needed for functionality, preferences,
                    settings, or account features.
                </p>

            </section>

            <section>

    <h3>Blur Chat Privacy</h3>

    <p>
        Blur Chat is designed to provide communication without requiring
        unnecessary personal information. Chat accounts do not require an
        email address, and Blur does not ask users to provide personal
        details to use basic chat features.
    </p>

    <p>
        Blur does not collect information for advertising, tracking, or
        building user profiles. Information used by chat features exists
        only to provide the service, such as delivering messages,
        maintaining channels, and supporting account functionality.
    </p>

</section>


<section>

    <h3>Chat Data</h3>

    <p>
        Messages, usernames, and profile information may be stored in order
        to make Blur Chat function properly. This information is used only
        for chat features and improving the reliability of the platform.
    </p>

    <p>
        Users should avoid sharing sensitive personal information in public
        channels or messages.
    </p>

</section>

            <section>

                <h3>How Information Is Used</h3>

                <p>
                    Information may be used to maintain services,
                    improve performance, fix problems, and create a
                    better experience.
                </p>

            </section>



            <section>

                <h3>Security</h3>

                <p>
                    We take reasonable steps to protect information and
                    maintain a safe environment for users.
                </p>

            </section>



            <section>

                <h3>Your Choices</h3>

                <p>
                    Users may control available preferences through Blur's
                    settings and browser controls.
                </p>

            </section>


        </div>

        `
    }

};



function loadLegalContent(){


    Object.entries(legalData).forEach(([key,page])=>{


        const panel=document.querySelector(
            `[data-panel="${key}"]`
        );


        if(!panel) return;


        panel.innerHTML=`

<div class="doc-header">

    <div class="doc-icon">
        <img src="assets/icons/legal.png">
    </div>


    <h2>${page.title}</h2>


    <p>${page.subtitle}</p>


    <div class="doc-updated">
        Last updated July 28, 2026
    </div>

</div>


            ${page.content}

        `;

    });

}


document.addEventListener(
    "DOMContentLoaded",
    loadLegalContent
);