(() => {

  const CURRENT_VERSION = '1.0.3';

  const CHANGELOG = [
    'added 2 new ports (games)',
    'added a whole new section in games (yt playables) 50+ games',
    'changed the game player popup to whole screen',
    'added popout button in the game player',
  ];

  const DEV_NOTE = "guys pleaseee i will fix movies sooon";

  function buildBody(){
    const body = document.getElementById('changelog-body');
    const list = document.createElement('div');
    list.className = 'changelog-list';
    CHANGELOG.forEach((text, i) => {
      const row = document.createElement('div');
      row.className = 'changelog-row';
      const num = document.createElement('span');
      num.className = 'changelog-row-num';
      num.textContent = String(CHANGELOG.length - i).padStart(2, '0');
      const label = document.createElement('span');
      label.className = 'changelog-row-text';
      label.textContent = text;
      row.appendChild(num);
      row.appendChild(label);
      list.appendChild(row);
    });
    body.appendChild(list);
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