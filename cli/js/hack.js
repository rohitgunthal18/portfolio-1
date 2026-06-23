// Hack simulation — a tongue-in-cheek, fully fake "penetration test" easter egg
// triggered by the `hack` command (via the startHack effect).
//
// It is purely cosmetic theatre: it installs nothing, contacts no network, and
// produces only randomized dummy data. The flow:
//   1. ASCII logo + boot banner.
//   2. "Installing" a set of well-known security tools with progress bars.
//   3. Prompt the visitor for a target URL.
//   4. Recon / scanning stage with timed, line-by-line output.
//   5. Prompt the visitor to choose an attack type.
//   6. Run the chosen "attack" with visuals, then print a fake report of dummy
//      findings (open ports, CVEs, credentials, etc.).
//   7. A clear disclaimer that the whole thing is a simulation.
//
// Everything is intentionally slow (staggered timers) so it feels like real
// long-running tooling. The renderer (js/terminal.js) provides the primitives:
//   appendLine(text, className), clearOutput(), scrollToNewest(),
//   setInputGated(enabled), readLine(promptLabel) -> Promise<string>,
//   endSession(), focusInput().
//
// Loaded as an ES module ("type": "module"). DOM access is only via the
// injected renderer, so this module never touches the DOM directly.

/**
 * ASCII logo shown at the start of the simulation.
 */
const HACK_LOGO = String.raw`
   ___    _____   ___    ____    ____    ____    ____
  / _ \  |_   _| |_ _|  / ___|  / ___|  / __ \  / __ \
 | | | |   | |    | |  | |  _  | |  _  | |  | || |  | |
 | |_| |   | |    | |  | |_| | | |_| | | |__| || |__| |
  \___/    |_|   |___|  \____|  \____|  \____/  \____/
        N  U  L  L  B  Y  T  E   ::  v3.3.7
`;

/** Tools "installed" during the setup phase. */
const TOOLS = [
  { name: 'nmap', ver: '7.94', size: '4.2 MB' },
  { name: 'metasploit-framework', ver: '6.4.12', size: '212 MB' },
  { name: 'sqlmap', ver: '1.8.3', size: '18 MB' },
  { name: 'hydra', ver: '9.5', size: '2.1 MB' },
  { name: 'aircrack-ng', ver: '1.7', size: '6.8 MB' },
  { name: 'john', ver: '1.9.0-jumbo', size: '34 MB' },
  { name: 'wireshark-cli', ver: '4.2.5', size: '88 MB' },
  { name: 'burpsuite', ver: '2024.3', size: '341 MB' },
];

/** Attack menu presented after recon. */
const ATTACKS = [
  { id: '1', name: 'SQL Injection', tag: 'sqlmap' },
  { id: '2', name: 'Brute-Force Login', tag: 'hydra' },
  { id: '3', name: 'DDoS Stress Test', tag: 'slowloris' },
  { id: '4', name: 'Full Exploit Chain', tag: 'metasploit' },
];

const HEX = '0123456789abcdef';
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const hex = (n) =>
  Array.from({ length: n }, () => HEX[rand(0, 15)]).join('');
const randIp = () => `${rand(11, 223)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`;

/**
 * Run the hack simulation against a renderer.
 *
 * @param {object} deps
 * @param {object} deps.renderer - TerminalRenderer providing the primitives
 *   listed in the module header.
 * @param {string} [deps.target] - Optional pre-supplied target (skips the first
 *   prompt when provided).
 * @param {Window} [deps.windowRef] - Timer source (setTimeout); defaults to global.
 * @returns {Promise<void>} Resolves when the simulation completes.
 */
export async function runHack({ renderer, target = '', windowRef } = {}) {
  if (!renderer || typeof renderer.appendLine !== 'function') return;
  const w = windowRef || (typeof window !== 'undefined' ? window : undefined);

  // Sleep helper. Falls back to immediate resolution when no timer exists
  // (e.g. node/tests) so the simulation never hangs.
  const sleep = (ms) =>
    new Promise((resolve) => {
      if (w && typeof w.setTimeout === 'function') w.setTimeout(resolve, ms);
      else resolve();
    });

  const out = (text = '', cls) => {
    renderer.appendLine(text, cls);
    renderer.scrollToNewest();
  };

  // Print a line slowly, character-typing feel by chunking (kept light so it
  // stays smooth). Resolves after the line is shown.
  const typeLine = async (text, cls, perCharMs = 0) => {
    out(text, cls);
    if (perCharMs > 0) await sleep(perCharMs * Math.min(text.length, 40));
  };

  // Animate a progress bar on a single line by rewriting the last output line.
  const progress = async (label, totalMs) => {
    const steps = 20;
    const el = renderer.appendLine('', 'hack-progress');
    const stepMs = Math.max(8, Math.floor(totalMs / steps));
    for (let i = 0; i <= steps; i += 1) {
      const filled = '█'.repeat(i);
      const empty = '░'.repeat(steps - i);
      const pct = String(Math.floor((i / steps) * 100)).padStart(3, ' ');
      if (el) el.textContent = `${label} [${filled}${empty}] ${pct}%`;
      renderer.scrollToNewest();
      await sleep(stepMs);
    }
  };

  try {
    renderer.setInputGated(false);

    // --- Intro logo -------------------------------------------------------
    out('');
    for (const lineText of HACK_LOGO.split('\n')) out(lineText, 'hack-logo');
    await typeLine('Initializing NullByte offensive toolkit...', 'hack-warn', 6);
    await sleep(500);
    out('Checking environment ............... ' , 'hack-dim');
    await sleep(300);
    out('  [OK] kernel  6.8.0-kali  x86_64', 'hack-ok');
    out('  [OK] privileges escalated to r00t', 'hack-ok');
    await sleep(500);

    // --- "Installing" tools ----------------------------------------------
    out('');
    await typeLine('Resolving dependencies and installing toolkit:', 'hack-info');
    for (const t of TOOLS) {
      out(`  fetching ${t.name} (${t.ver}) — ${t.size}`, 'hack-dim');
      await progress(`  installing ${t.name}`, rand(450, 1100));
      out(`  ✔ ${t.name} ready`, 'hack-ok');
      await sleep(150);
    }
    await sleep(400);
    out('All packages installed successfully.', 'hack-ok');
    out('');

    // --- Target prompt ----------------------------------------------------
    let tgt = (target || '').trim();
    if (!tgt) {
      out('Enter the TARGET to engage (domain or URL).', 'hack-info');
      out('e.g. example.com  —  type "abort" to stand down.', 'hack-dim');
      tgt = (await renderer.readLine('target> ')).trim();
    }
    if (!tgt || tgt.toLowerCase() === 'abort') {
      out('');
      out('Engagement aborted. No targets were harmed. ;)', 'hack-warn');
      return;
    }

    const host = tgt.replace(/^https?:\/\//i, '').replace(/\/.*$/, '') || tgt;
    const ip = randIp();

    out('');
    await typeLine(`Locking on target: ${host}`, 'hack-warn', 8);
    await sleep(400);
    out(`Resolving DNS for ${host} ...`, 'hack-dim');
    await sleep(700);
    out(`  A record  -> ${ip}`, 'hack-ok');
    out(`  ASN       -> AS${rand(1000, 65000)}  (CloudEdge Networks)`, 'hack-ok');
    out(`  GeoIP     -> ${pick(['Frankfurt, DE', 'Ashburn, US', 'Mumbai, IN', 'Singapore, SG'])}`, 'hack-ok');
    await sleep(500);

    // --- Recon / scanning -------------------------------------------------
    out('');
    await typeLine(`Starting Nmap 7.94 scan against ${ip} ...`, 'hack-info', 5);
    await progress('  scanning 65535 ports', 2200);
    const ports = [
      { p: 22, s: 'ssh', v: 'OpenSSH 8.9p1' },
      { p: 80, s: 'http', v: 'nginx 1.24.0' },
      { p: 443, s: 'https', v: 'nginx 1.24.0 (TLS1.3)' },
      { p: 3306, s: 'mysql', v: 'MySQL 8.0.36' },
      { p: 6379, s: 'redis', v: 'Redis 7.2.4' },
    ];
    out('  PORT      STATE   SERVICE   VERSION', 'hack-dim');
    for (const pt of ports) {
      out(
        `  ${String(pt.p + '/tcp').padEnd(9)} ${'open'.padEnd(7)} ${pt.s.padEnd(9)} ${pt.v}`,
        'hack-ok',
      );
      await sleep(rand(250, 550));
    }
    await sleep(400);
    out(`  ${ports.length} open ports found · scan completed in ${(rand(180, 420) / 10).toFixed(1)}s`, 'hack-info');

    // --- Attack selection -------------------------------------------------
    out('');
    out('Select an attack vector:', 'hack-info');
    for (const a of ATTACKS) out(`  [${a.id}] ${a.name}  (${a.tag})`, 'hack-dim');
    let choice = (await renderer.readLine('attack> ')).trim();
    let attack = ATTACKS.find((a) => a.id === choice) ||
      ATTACKS.find((a) => a.name.toLowerCase() === choice.toLowerCase());
    if (!attack) {
      out(`Unknown vector "${choice}", defaulting to Full Exploit Chain.`, 'hack-warn');
      attack = ATTACKS[3];
    }

    // --- Run the chosen attack -------------------------------------------
    out('');
    await typeLine(`Launching ${attack.name} via ${attack.tag} ...`, 'hack-warn', 8);
    await sleep(500);

    const phases = attackPhases(attack, host);
    for (const ph of phases) {
      out(ph.line, 'hack-dim');
      await progress(`  ${ph.bar}`, rand(700, 1500));
      if (ph.ok) out(`  ✔ ${ph.ok}`, 'hack-ok');
      await sleep(250);
    }

    // --- Fake report ------------------------------------------------------
    await sleep(500);
    out('');
    out('══════════════════════════════════════════════', 'hack-info');
    out('             ENGAGEMENT REPORT', 'hack-info');
    out('══════════════════════════════════════════════', 'hack-info');
    out(`  Target        : ${host} (${ip})`, 'hack-ok');
    out(`  Attack        : ${attack.name}`, 'hack-ok');
    out(`  Session ID    : 0x${hex(8)}`, 'hack-ok');
    out(`  Duration      : ${rand(40, 180)}s`, 'hack-ok');
    out('', 'hack-dim');
    out('  FINDINGS:', 'hack-warn');
    out(`   • ${rand(2, 7)} critical · ${rand(3, 11)} high · ${rand(5, 20)} medium`, 'hack-ok');
    out(`   • CVE-${rand(2021, 2024)}-${rand(1000, 49999)}  (RCE, CVSS ${(rand(75, 99) / 10).toFixed(1)})`, 'hack-ok');
    out(`   • CVE-${rand(2021, 2024)}-${rand(1000, 49999)}  (SQLi, CVSS ${(rand(60, 89) / 10).toFixed(1)})`, 'hack-ok');
    out('', 'hack-dim');
    out('  HARVESTED CREDENTIALS (sample):', 'hack-warn');
    const users = ['admin', 'root', 'devops', 'support', 'rohit'];
    for (let i = 0; i < 3; i += 1) {
      out(`   ${pick(users)}:${hex(rand(8, 12))}  →  ${pick(['cracked', 'cracked', 'hash only'])}`, 'hack-ok');
      await sleep(300);
    }
    out('', 'hack-dim');
    out(`  EXFILTRATED: ${(rand(12, 870) / 10).toFixed(1)} GB across ${rand(3, 19)} tables`, 'hack-ok');
    out('  ACCESS LEVEL: ███ ROOT / DOMAIN ADMIN ███', 'hack-warn');
    await sleep(600);

    // --- Disclaimer -------------------------------------------------------
    out('');
    out('──────────────────────────────────────────────', 'hack-dim');
    await typeLine("Just kidding! 🎭  That was 100% simulation.", 'hack-info', 10);
    out('No tools were installed, no packets were sent, and no', 'hack-dim');
    out('systems were touched. This is an easter egg in Rohit\'s', 'hack-dim');
    out('portfolio — built purely for fun.', 'hack-dim');
    out("Type 'help' to explore the real portfolio.", 'hack-ok');
    out('');
  } finally {
    // Always restore the normal prompt and input, even on early return.
    renderer.endSession();
    renderer.setInputGated(true);
    renderer.focusInput();
    renderer.scrollToNewest();
  }
}

/**
 * Build the per-attack phase list (label + progress-bar caption + success).
 * @param {{ name: string, tag: string }} attack
 * @param {string} host
 * @returns {Array<{ line: string, bar: string, ok?: string }>}
 */
function attackPhases(attack, host) {
  switch (attack.id) {
    case '1': // SQLi
      return [
        { line: `  enumerating injectable parameters on ${host}`, bar: 'testing payloads', ok: 'found 3 injectable params' },
        { line: '  fingerprinting backend DBMS', bar: 'probing MySQL', ok: 'MySQL 8.0.36 confirmed' },
        { line: '  dumping database schema', bar: 'extracting tables', ok: 'dumped users, orders, sessions' },
      ];
    case '2': // brute force
      return [
        { line: '  loading rockyou.txt (14,344,392 entries)', bar: 'priming wordlist', ok: 'wordlist loaded' },
        { line: `  spraying credentials at ${host}:22`, bar: 'attempting logins', ok: 'valid login found' },
        { line: '  establishing persistent session', bar: 'opening backdoor', ok: 'shell acquired' },
      ];
    case '3': // ddos
      return [
        { line: '  spinning up 4,096 worker sockets', bar: 'allocating bots', ok: 'botnet online' },
        { line: `  flooding ${host} with SYN packets`, bar: 'saturating uplink', ok: 'target latency 8200ms' },
        { line: '  holding connections open', bar: 'slowloris active', ok: 'service degraded' },
      ];
    default: // full chain
      return [
        { line: '  loading metasploit modules', bar: 'staging exploits', ok: '142 modules ready' },
        { line: `  delivering payload to ${host}`, bar: 'exploiting RCE', ok: 'meterpreter session 1 opened' },
        { line: '  escalating privileges', bar: 'bypassing UAC', ok: 'SYSTEM obtained' },
        { line: '  pivoting through internal network', bar: 'mapping subnet', ok: '6 hosts compromised' },
      ];
  }
}
