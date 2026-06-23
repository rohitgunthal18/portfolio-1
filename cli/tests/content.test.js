import { describe, it, expect } from 'vitest';
import {
  EDUCATION_TEXT,
  CERTS_TEXT,
  PIXICO_TEXT,
  AI_CHATBOT_TEXT,
  VEDPUTRA_TEXT,
  GKLAB_TEXT,
  SHAREKAROO_TEXT,
  EDUINFRA_TEXT,
  JOBTRENDS_TEXT,
  CONTACT_TEXT,
  PORTFOLIO_FS,
} from '../js/content.js';

// Example/unit tests asserting concrete portfolio content facts derived from
// index1.html. These complement the property tests by pinning down the exact
// values that must appear in each section (Requirements 4.5, 4.6, 4.9, 4.10).

describe('education content (Req 4.5)', () => {
  it('includes the SSC score of 91%', () => {
    expect(EDUCATION_TEXT).toContain('91%');
    expect(EDUCATION_TEXT).toContain('Secondary School (SSC)');
  });

  it('includes the HSC score of 64%', () => {
    expect(EDUCATION_TEXT).toContain('64%');
    expect(EDUCATION_TEXT).toContain('Higher Secondary (HSC)');
  });

  it('includes the B.Sc Computer Science CGPA of 8.34', () => {
    expect(EDUCATION_TEXT).toContain('8.34');
    expect(EDUCATION_TEXT).toContain('Bachelor of Science (Computer Science)');
  });
});

describe('certifications content (Req 4.6)', () => {
  it('includes the Prompt Engineering certification', () => {
    expect(CERTS_TEXT).toContain('Prompt Engineering for Generative AI');
  });

  it('includes the Software Engineering with Agentic AI certification', () => {
    expect(CERTS_TEXT).toContain('Software Engineering with Agentic AI');
  });

  it('attributes both certifications to IBM/Coursera', () => {
    expect(CERTS_TEXT).toContain('Prompt Engineering for Generative AI (IBM/Coursera)');
    expect(CERTS_TEXT).toContain('Software Engineering with Agentic AI (IBM/Coursera)');
  });
});

describe('project content: stacks and live URLs (Req 4.9)', () => {
  const projects = [
    {
      name: 'Pixico',
      text: PIXICO_TEXT,
      stack: ['Next.js 15', 'Supabase', 'OpenRouter API', 'TypeScript'],
      url: 'https://pixico.co',
    },
    {
      name: 'AI Chatbot SaaS Platform',
      text: AI_CHATBOT_TEXT,
      stack: ['Python (Flask)', 'Claude 3 (AI)', 'SQLAlchemy', 'Bootstrap 5'],
      url: 'https://chat-bot-tdss.onrender.com/',
    },
    {
      name: 'VedPutra Organics',
      text: VEDPUTRA_TEXT,
      stack: ['Next.js 14', 'Supabase', 'Cashfree PG', 'TypeScript'],
      url: 'https://www.vedputra.store/',
    },
    {
      name: 'GK Lab',
      text: GKLAB_TEXT,
      stack: ['PHP', 'MySQL', 'JavaScript', 'RESTful API'],
      url: 'https://gklab.unaux.com/',
    },
    {
      name: 'ShareKaroo',
      text: SHAREKAROO_TEXT,
      stack: ['WebRTC', 'Node.js', 'WebSocket', 'Vanilla JS'],
      url: 'https://sharekaroo.online/',
    },
    {
      name: 'Edu Infra',
      text: EDUINFRA_TEXT,
      stack: ['React.js', 'MERN Stack', 'Python', 'Flutter'],
      url: 'https://eduinfra.vercel.app/',
    },
    {
      name: 'JobTrends',
      text: JOBTRENDS_TEXT,
      stack: ['React.js', 'TailwindCSS', 'Chart.js', 'Node.js'],
      url: 'https://job-trends.netlify.app/',
    },
  ];

  for (const project of projects) {
    describe(project.name, () => {
      it('lists its technology stack', () => {
        for (const tech of project.stack) {
          expect(project.text).toContain(tech);
        }
      });

      it('lists its live URL', () => {
        expect(project.text).toContain(project.url);
      });
    });
  }

  it('exposes one .txt file per project under projects/ in PORTFOLIO_FS', () => {
    const projectsDir = PORTFOLIO_FS.children.projects;
    expect(projectsDir.type).toBe('dir');
    expect(Object.keys(projectsDir.children).sort()).toEqual(
      [
        'ai-chatbot.txt',
        'eduinfra.txt',
        'gklab.txt',
        'jobtrends.txt',
        'pixico.txt',
        'sharekaroo.txt',
        'vedputra.txt',
      ].sort(),
    );
  });

  it('reaches every live URL via the projects directory files in PORTFOLIO_FS', () => {
    const projectsDir = PORTFOLIO_FS.children.projects;
    const allProjectContent = Object.values(projectsDir.children)
      .map((node) => node.content)
      .join('\n');

    const urls = [
      'https://pixico.co',
      'https://chat-bot-tdss.onrender.com/',
      'https://www.vedputra.store/',
      'https://gklab.unaux.com/',
      'https://sharekaroo.online/',
      'https://eduinfra.vercel.app/',
      'https://job-trends.netlify.app/',
    ];

    for (const url of urls) {
      expect(allProjectContent).toContain(url);
    }
  });
});

describe('contact content (Req 4.10)', () => {
  it('includes the email address', () => {
    expect(CONTACT_TEXT).toContain('rohitgunthal1819@gmail.com');
  });

  it('includes the phone number', () => {
    expect(CONTACT_TEXT).toContain('+91 84080 88454');
  });

  it('includes the location', () => {
    expect(CONTACT_TEXT).toContain('Malegaon, Beed, Maharashtra 431123');
  });

  it('includes the LinkedIn and Instagram handle xrohia', () => {
    expect(CONTACT_TEXT).toContain('xrohia');
    expect(CONTACT_TEXT).toContain('https://www.linkedin.com/in/xrohia');
    expect(CONTACT_TEXT).toContain('https://www.instagram.com/xrohia');
  });

  it('includes the GitHub handle rohitgunthal18', () => {
    expect(CONTACT_TEXT).toContain('rohitgunthal18');
    expect(CONTACT_TEXT).toContain('https://github.com/rohitgunthal18');
  });

  it('includes the WhatsApp handle 918408088454', () => {
    expect(CONTACT_TEXT).toContain('918408088454');
    expect(CONTACT_TEXT).toContain('https://wa.me/918408088454');
  });
});
