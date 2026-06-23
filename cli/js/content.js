// Portfolio content for the Terminal Portfolio, derived from index1.html.
// Pure data, no DOM access. Loaded as an ES module ("type": "module").
//
// Each constant below holds the plain-text content of one portfolio section
// file. PORTFOLIO_FS assembles these into the simulated file-system tree
// described in design.md ("File System Tree"). All facts trace to the
// "Portfolio Content" table and Requirements 4.4–4.10.

import { file, dir } from './config.js';

/**
 * about.txt — AI-Powered Full-Stack Developer summary (Req 4.4).
 */
export const ABOUT_TEXT = `About Rohit Balasaheb Gunthal
=============================

I'm Rohit Balasaheb Gunthal, an AI-Powered Full-Stack Developer who builds
end-to-end, production-ready web applications that solve real-world problems.

I don't just write code — I think through the entire product. From user-facing
interfaces to admin dashboards with analytics, payment integrations, and cloud
deployment, I architect and deliver complete systems. This full-cycle thinking
is what sets me apart: while most developers build features, I build businesses.

I leverage modern AI tools like Claude Code, Cursor, and Antigravity to achieve
rapid project delivery without compromising quality. Ranked in the Top 3% of
global ChatGPT users (2025), I integrate AI deeply into my development workflow,
from prompt engineering to agentic code generation, to ship faster and smarter.
I focus on Agentic AI and have a growing interest in Cybersecurity.

A 2025 B.Sc Computer Science graduate, I've already delivered client projects
like the VedPutra e-commerce platform and built SaaS products like Pixico and
the AI Chatbot Platform — all live and deployed.

Highlights:
  - 18+ Projects Completed
  - 5+ Certifications
  - 3+ Years Learning
  - Top 3% Global ChatGPT Users (2025)`;

/**
 * education.txt — SSC, HSC, and B.Sc Computer Science (Req 4.5).
 */
export const EDUCATION_TEXT = `Education
========

[2018] Secondary School (SSC)
  School:      Maharashtra State Board
  Percentage:  91%
  Achievement: Class Rank 1 — 10th Board Exam

[2020] Higher Secondary (HSC)
  School:      Maharashtra State Board
  Percentage:  64%

[2021 - 2025] Bachelor of Science (Computer Science)
  College:     College of Computer Science and Information Technology, Latur
  CGPA:        8.34
  Achievement: 2nd Prize — Final Year Project`;

/**
 * certifications.txt — IBM/Coursera certificates (Req 4.6).
 */
export const CERTS_TEXT = `Certifications
==============

1. Prompt Engineering for Generative AI (IBM/Coursera)
   - Persona & Context prompting techniques
   - Chain-of-Thought & Zero-shot/Few-shot learning
   - Prompt optimization and toxicity filtering
   - Real-world applications of LLM prompting

2. Software Engineering with Agentic AI (IBM/Coursera)
   - Building AI Agents with reasoning capabilities
   - Implementation of Tool-Calling & Function calling
   - Multi-agent coordination and task decomposition
   - Integration of agents into the SDLC`;

/**
 * skills.txt — programming, tools, AI dev, soft skills, languages (Req 4.7).
 */
export const SKILLS_TEXT = `Skills
======

Programming:       Python, SQL, JavaScript, HTML5, CSS3
Tools & Platforms: Git, GitHub, Excel, Postman, Supabase
AI Development:    Prompt Engineering, Cursor, GitHub Copilot, Antigravity
Soft Skills:       Problem Solving, Analytical Thinking, Self-Learning,
                   Communication, Team Collaboration, Adaptability
Languages:         English (Professional), Hindi (Professional),
                   Marathi (Native)`;

/**
 * experience.txt — derived from index1.html experience timeline (Req 4.8).
 */
export const EXPERIENCE_TEXT = `Experience
==========

[Personal Project] AI Business Chatbot Platform — Full Stack Development
  Developed a B2B AI platform for customized support bots, featuring automated
  booking and Telegram integration.

[Client Project] Vedputra E-commerce Platform — E-Commerce Solution
  Built a high-performance platform with real-time inventory, secure payments
  (Cashfree), and specialized SEO optimizations.`;

/**
 * Per-project file contents (Req 4.9). Each includes its technology stack and
 * live URL.
 */
export const PIXICO_TEXT = `Pixico (AI Prompt Platform)
===========================

Stack: Next.js 15, Supabase, OpenRouter API, TypeScript
Live:  https://pixico.co

A premium platform designed to bridge the gap in AI accessibility by providing
high-quality, professionally engineered prompts for image and video generation
(Midjourney, Flux). Built with a "sell the shovel" philosophy for the
Generative AI era.

  - Performance First: Built with Next.js 15 and TypeScript for scalability
    and speed.
  - AI Orchestration: Integrated OpenRouter for seamless AI model coordination.
  - User Experience: Smooth Neo-Brutalist UI powered by React Spring.
  - Security & Backend: Supabase for robust authentication and high-performance
    data storage.`;

export const AI_CHATBOT_TEXT = `AI Chatbot SaaS Platform
========================

Stack: Python (Flask), Claude 3 (AI), SQLAlchemy, Bootstrap 5
Live:  https://chat-bot-tdss.onrender.com/

A robust SaaS platform enabling businesses to deploy custom-trained AI
assistants. Powered by Claude 3 Haiku, it provides professional, context-aware
responses to enhance 24/7 customer support.

  - AI Integration: Custom FAQ and business-specific training via OpenRouter
    and Claude 3.
  - Embeddable Solution: Plug-and-play chat widget for seamless website
    integration.
  - Admin Control: Full-featured dashboard for monitoring conversations and
    managing bot knowledge.
  - Architecture: Built with Flask and SQLAlchemy for persistent conversation
    tracking and secure auth.`;

export const VEDPUTRA_TEXT = `VedPutra Organics Store
=======================

Stack: Next.js 14, Supabase, Cashfree PG, TypeScript
Live:  https://www.vedputra.store/

A high-performance organic e-commerce storefront designed with an SEO-first
approach. Features a seamless checkout flow, real-time inventory management,
and a robust admin infrastructure.

  - E-commerce Architecture: Cashfree PG for secure payments and Supabase for
    real-time inventory and RLS-backed data.
  - SEO & Marketing: Advanced SEO (Sitemaps, RSS, Robots) and a verified-buyer
    review system.
  - Admin Dashboard: Analytics, CRM, coupon management, and CSV exports.
  - Security: Hardened with JWT/httpOnly cookies, strict CSP middleware, and
    inventory-guarded stock checks.`;

export const GKLAB_TEXT = `GK Lab (Diagnostics System)
===========================

Stack: PHP, MySQL, JavaScript, RESTful API
Live:  https://gklab.unaux.com/

A comprehensive diagnostic center management system for medical laboratories,
streamlining patient workflows from booking to result delivery.

  - Online Booking: Automated test scheduling, health package selection, and
    doorstep sample collection.
  - Result Delivery: Secure portal for digital test results and health record
    management.
  - Lab CRM: Admin dashboard to manage appointments, patients, and financial
    analytics.
  - Security: Session-based authentication, CSRF protection, and secure
    password hashing.`;

export const SHAREKAROO_TEXT = `ShareKaroo (P2P File Transfer)
==============================

Stack: WebRTC, Node.js, WebSocket, Vanilla JS
Live:  https://sharekaroo.online/

A browser-based peer-to-peer file sharing application for fast, private
transfers. Built to solve the privacy concerns of cloud storage by enabling
direct device-to-device communication.

  - P2P Architecture: WebRTC DataChannels for direct transfers without size
    limits.
  - Security First: End-to-end encrypted via DTLS by default; files never touch
    any server.
  - Zero Installation: Works directly in modern browsers using an elegant QR
    code pairing system.
  - Signaling Logic: Custom Node.js/WebSocket server for efficient peer
    discovery and handshake.`;

export const EDUINFRA_TEXT = `Edu Infra (Project Hub)
=======================

Stack: React.js, MERN Stack, Python, Flutter
Live:  https://eduinfra.vercel.app/

A comprehensive platform for ready-made academic projects and technical
solutions, helping students bridge the gap between learning and deployment.

  - Diverse Expertise: Projects in Full-stack Web, Mobile Apps, AI/ML
    (TensorFlow), and Game Dev (Unity).
  - Ready-to-Deploy: Fully functional source code, full documentation, and
    lifetime deployment support.
  - Academic Excellence: Helps students learn complex architectures faster
    through real-world implementations.
  - Responsive Ecosystem: Built using React and Node.js for a smooth,
    high-performance user experience.`;

export const JOBTRENDS_TEXT = `JobTrends Analysis
==================

Stack: React.js, TailwindCSS, Chart.js, Node.js
Live:  https://job-trends.netlify.app/

A market intelligence platform designed to provide in-depth insights into job
market trends using powerful data visualization tools.

  - Dynamic Analytics: Interactive job market dashboards with trend
    visualization via Chart.js.
  - Skill Forecasting: AI-driven insights into skill demand and career trend
    recommendations.
  - Modern Aesthetic: Cyber-tech design language using TailwindCSS and
    responsive principles.
  - Market Insights: Real-time industry data exploration helping users make
    informed career decisions.`;

/**
 * contact.txt — email, phone, location, and social handles (Req 4.10, 10.1).
 */
export const CONTACT_TEXT = `Contact
=======

Email:     rohitgunthal1819@gmail.com
Phone:     +91 84080 88454
Location:  Malegaon, Beed, Maharashtra 431123

Connect with me:
  LinkedIn:  xrohia        (https://www.linkedin.com/in/xrohia)
  GitHub:    rohitgunthal18 (https://github.com/rohitgunthal18)
  Instagram: xrohia        (https://www.instagram.com/xrohia)
  WhatsApp:  918408088454  (https://wa.me/918408088454)

Tip: run 'contact <message>' to send me an email, or 'cv' to view my resume.`;

/**
 * The simulated file system: home directory "Portfolio~" containing one
 * directory per portfolio section. The projects directory contains one .txt
 * file per project; every other section directory contains a single .txt file.
 *
 * Mirrors the design.md "File System Tree" structure (Req 3.2).
 */
export const PORTFOLIO_FS = dir('Portfolio~', {
  about: dir('about', {
    'about.txt': file(ABOUT_TEXT),
  }),
  education: dir('education', {
    'education.txt': file(EDUCATION_TEXT),
  }),
  projects: dir('projects', {
    'pixico.txt': file(PIXICO_TEXT),
    'ai-chatbot.txt': file(AI_CHATBOT_TEXT),
    'vedputra.txt': file(VEDPUTRA_TEXT),
    'gklab.txt': file(GKLAB_TEXT),
    'sharekaroo.txt': file(SHAREKAROO_TEXT),
    'eduinfra.txt': file(EDUINFRA_TEXT),
    'jobtrends.txt': file(JOBTRENDS_TEXT),
  }),
  certifications: dir('certifications', {
    'certifications.txt': file(CERTS_TEXT),
  }),
  skills: dir('skills', {
    'skills.txt': file(SKILLS_TEXT),
  }),
  experience: dir('experience', {
    'experience.txt': file(EXPERIENCE_TEXT),
  }),
  contact: dir('contact', {
    'contact.txt': file(CONTACT_TEXT),
  }),
});
