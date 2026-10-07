/* =========================================================
   auth.js
   Supabase Auth credentials + sign-in UI (username + password,
   no email required).

   The auth LIFECYCLE (session restore, profile loading, state
   listeners, sign-out) lives in the global Account service —
   see account.js at the project root. This file only knows how
   to turn a username+password into a session and how to draw
   the sign-in card; it holds no auth state.

   Supabase Auth itself is still email-based under the hood, so
   we deterministically turn every username into a fake, never-
   emailed address (username@accounts.blur.invalid — ".invalid"
   is a reserved TLD that can never resolve) and use that
   everywhere instead of asking people for a real email.

   IMPORTANT: this only works if "Confirm email" is turned OFF
   in Supabase Dashboard → Authentication → Providers → Email.
   With it on, signUp() will "succeed" but never return a
   session (because the confirmation email can never arrive at
   a .invalid address), and people will get stuck.

   NOTE: this is a breaking change for any accounts created
   under the old email+password flow — their real email won't
   match the generated username@accounts.blur.invalid address,
   so they won't be able to sign back in through this form.
   ========================================================= */

const Auth = {

  usernameToEmail(username){
    return `${username.trim().toLowerCase()}@accounts.blur.invalid`;
  },

  async signUp(username, password){
    username = username.trim();
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      throw new Error("Usernames must be 3–24 characters using letters, numbers, or underscores.");
    }
    const nameError = window.BlurNamePolicy?.error(username);
    if (nameError) throw new Error(nameError);
    const email = this.usernameToEmail(username);

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { username } } // read back out in chat.js to create the profile row
    });

    if (error) {
      if (/already registered|already exists/i.test(error.message || "")) {
        throw new Error("That username is already taken.");
      }
      throw error;
    }

    if (!data.session) {
      // "Confirm email" is still on in the Supabase dashboard —
      // signup went through but there's no way to confirm a
      // .invalid address. Surface this clearly instead of
      // silently hanging.
      throw new Error("Sign-up couldn't finish — ask the site owner to turn off email confirmation for this project.");
    }

    // Deliberately NOT creating the profile row here. chat.js's
    // handleAuthChange is the single place that does it (using
    // the username stashed in options.data above) — having only
    // one place that creates profiles avoids a race between this
    // function and the auth-state listener both trying to do it.
    return data;
  },

  async signIn(username, password){
    const email = this.usernameToEmail(username);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      if (/invalid login credentials/i.test(error.message || "")) {
        throw new Error("Incorrect username or password.");
      }
      throw error;
    }
    return data;
  },

  /**
   * Renders the sign-in / sign-up card into `container`.
   * On success, Supabase fires onAuthStateChange and Chat
   * picks it up from there — this function doesn't need to
   * call anything itself.
   */
  renderAuthScreen(container){
    let mode = "signin"; // "signin" | "signup"

    const draw = () => {
      container.innerHTML = `
        <div class="auth-screen">
          <div class="auth-card">
            <div class="auth-mark"><span></span></div>
            <h2>${mode === "signin" ? "Welcome back" : "Create your account"}</h2>
            <p class="auth-sub">${mode === "signin"
              ? "Sign in to join the conversation."
              : "Pick a username and password — no email needed."}</p>

            <form class="auth-form" novalidate>
              <label>
                Username
                <input type="text" name="username" minlength="3" maxlength="24"
                  pattern="[a-zA-Z0-9_]+" required autocomplete="username" placeholder="e.g. nightowl">
              </label>
              <label>
                Password
                <input type="password" name="password" minlength="6"
                  autocomplete="${mode === "signin" ? "current-password" : "new-password"}" required>
              </label>

              <div class="auth-error" hidden></div>

              <button type="submit" class="auth-submit">
                ${mode === "signin" ? "Sign in" : "Sign up"}
              </button>
            </form>

            <button type="button" class="auth-switch">
              ${mode === "signin"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      `;

      const form = container.querySelector(".auth-form");
      const errorBox = container.querySelector(".auth-error");
      const submitBtn = container.querySelector(".auth-submit");

      container.querySelector(".auth-switch").addEventListener("click", () => {
        mode = mode === "signin" ? "signup" : "signin";
        draw();
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorBox.hidden = true;
        submitBtn.disabled = true;
        submitBtn.textContent = "Please wait…";

        const username = form.username.value.trim();
        const password = form.password.value;

        try {
          if (mode === "signin") {
            await Auth.signIn(username, password);
          } else {
            await Auth.signUp(username, password);
          }
        } catch (err) {
          errorBox.hidden = false;
          errorBox.textContent = err.message || "Something went wrong.";
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = mode === "signin" ? "Sign in" : "Sign up";
        }
      });
    };

    draw();
  }
};
