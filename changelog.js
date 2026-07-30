(() => {

  const CURRENT_VERSION = '1.0.0';

  // newest first — flat list, no tags
  const CHANGELOG = [
    'Initial release',
    'Made core features',
    'Polished UI',
    'Fixed various bugs'
  ];

  const DEV_NOTE = "yay site is released 🥹👌 also music is still kinda buggy, it will be fixed soon!";

  function buildBody(){
    const body = document.getElementById('changelog-body');
    const ul = document.createElement('ul');
    CHANGELOG.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      ul.appendChild(li);
    });
    body.appendChild(ul);
  }

  function openChangelog(){ document.getElementById('changelog-overlay').classList.add('open'); }
  function closeChangelog(){ document.getElementById('changelog-overlay').classList.remove('open'); }

  document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('changelog-version-tag').textContent = `v${CURRENT_VERSION}`;
    document.getElementById('changelog-devnote-text').textContent = DEV_NOTE;

    buildBody();

    document.getElementById('changelog-close').addEventListener('click', closeChangelog);
    document.getElementById('changelog-overlay').addEventListener('click', e => {
      if (e.target.id === 'changelog-overlay') closeChangelog();
    });

    // always open on load
    openChangelog();

  });

})();