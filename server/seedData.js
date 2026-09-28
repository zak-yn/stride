/**
 * Headway Editorial Curated Seed Catalog
 * 5 Iconic Microlearning Masterpieces with complete 5-chapter summaries,
 * Insight Gems (SM-2 Flashcards), and Interactive Scenario Quizzes.
 */

export const seedBooks = [
  {
    id: "atomic-habits",
    title: "Atomic Habits",
    author: "James Clear",
    category: "Productivity & Habits",
    readTimeMin: 15,
    coverAccent: "#F5C518",
    synopsis: "Tiny changes can produce remarkable results. Master the Four Laws of Behavior Change to break bad habits and build enduring positive routines.",
    keyTakeaways: [
      "Habits are the compound interest of self-improvement: 1% better every day yields a 37x improvement in one year.",
      "Focus on systems rather than goals. You do not rise to the level of your goals; you fall to the level of your systems.",
      "Identity-based habits are the most durable: decide who you want to be, then prove it to yourself with small wins.",
      "The Four Laws: Make it Obvious, Make it Attractive, Make it Easy, Make it Satisfying."
    ],
    chapters: [
      {
        chapterIndex: 1,
        title: "The Surprising Power of Atomic Habits",
        content: "Too often, we convince ourselves that massive success requires massive action. Whether it is losing weight, building a business, or writing a book, we put pressure on ourselves to make some earth-shattering improvement that everyone will talk about. Meanwhile, improving by 1 percent isn't particularly notable—sometimes it isn't even noticeable—but it can be far more meaningful, especially in the long run. If you can get 1 percent better each day for one year, you'll end up thirty-seven times better by the time you're done. Conversely, if you get 1 percent worse each day for one year, you'll decline nearly down to zero. What starts as a small win or a minor setback accumulates into something much more. Habits are the compound interest of self-improvement. The same way that money multiplies through compound interest, the effects of your habits multiply as you repeat them."
      },
      {
        chapterIndex: 2,
        title: "How Habits Shape Your Identity",
        content: "It is easy to change what you do when you change who you believe you are. Most people try to change their habits by focusing on outcome-based change: what they want to achieve. A better approach is identity-based habits: who you wish to become. Imagine two people resisting a cigarette. When offered a smoke, the first person says, 'No thanks, I'm trying to quit.' This sounds reasonable, but they still believe they are a smoker who is trying to do something else. The second person declines by saying, 'No thanks, I'm not a smoker.' It's a small difference, but this statement signals a shift in identity. The ultimate form of intrinsic motivation is when a habit becomes part of your identity. Every action you take is a vote for the type of person you wish to become."
      },
      {
        chapterIndex: 3,
        title: "The 1st & 2nd Laws: Make It Obvious and Attractive",
        content: "The process of building a habit can be divided into four simple steps: cue, craving, response, and reward. To build a good habit, the 1st Law is to Make it Obvious. Design your environment so the cues of good habits are visible and prominent. If you want to drink more water, fill several water bottles and place them in common locations around your home. The 2nd Law is to Make it Attractive. Dopamine is released not only when you experience pleasure, but also when you anticipate it. Use temptation bundling: pair an action you want to do with an action you need to do. For instance, only listen to your favorite podcast while doing the dishes or working out on the treadmill."
      },
      {
        chapterIndex: 4,
        title: "The 3rd Law: Make It Easy",
        content: "Human behavior follows the Law of Least Effort. We naturally gravitate toward the option that requires the least amount of work. To create a habit, reduce the friction associated with good behaviors. Prime your environment for future use: lay out your gym clothes the night before, set your guitar in the middle of the living room, and chop vegetables in advance. Crucially, master the 2-Minute Rule: when you start a new habit, it should take less than two minutes to do. 'Read before bed each night' becomes 'Read one page.' 'Run three miles' becomes 'Tie my running shoes.' Optimize for the starting line, not the finish line."
      },
      {
        chapterIndex: 5,
        title: "The 4th Law: Make It Satisfying",
        content: "What is immediately rewarded is repeated. What is immediately punished is avoided. The first three laws increase the odds that an action will be performed this time. The fourth law increases the odds that an action will be repeated next time. Because our brains evolved to value immediate rewards over delayed rewards, we must provide an immediate sense of accomplishment. Use habit trackers to make your progress visual and visceral: don't break the chain. And when you inevitably slip up, remember the golden rule: never miss twice. If you miss one day, get back on track immediately the next day."
      }
    ],
    flashcards: [
      {
        id: "ah-fc-1",
        bookId: "atomic-habits",
        front: "What is the compound effect of getting 1% better every day for a year?",
        back: "You end up 37 times better (1.01^365 = 37.78). Habits are the compound interest of self-improvement.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      },
      {
        id: "ah-fc-2",
        bookId: "atomic-habits",
        front: "Why are identity-based habits superior to outcome-based habits?",
        back: "Outcome habits focus on what you get; identity habits focus on who you become. Every habit is a vote for your future identity.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      },
      {
        id: "ah-fc-3",
        bookId: "atomic-habits",
        front: "What is the 2-Minute Rule for habit formation?",
        back: "Scale down any new habit so it takes under two minutes to start ('Tie shoes' instead of 'Run 5 miles'). Standardize before you optimize.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      },
      {
        id: "ah-fc-4",
        bookId: "atomic-habits",
        front: "How do you apply Temptation Bundling to make habits attractive?",
        back: "Link an action you want to do with an action you need to do (e.g., only watch your favorite show while running on the treadmill).",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      },
      {
        id: "ah-fc-5",
        bookId: "atomic-habits",
        front: "What is the golden recovery rule when you break a habit streak?",
        back: "Never miss twice. Missing once is an accident; missing twice is the start of a new, bad habit.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      }
    ],
    quiz: {
      scenario: "You want to build a daily morning meditation habit, but you constantly forget or get distracted by your smartphone when you wake up.",
      options: [
        "Rely on sheer willpower and write a sticky note on the bathroom mirror.",
        "Charge your phone in another room overnight and place your meditation cushion right beside your bed.",
        "Commit to a rigorous 45-minute guided session every morning starting tomorrow."
      ],
      correctIndex: 1,
      explanation: "Applying the 1st and 3rd laws: remove the distracting cue (phone in another room) and make the target cue obvious and frictionless (cushion beside bed)."
    },
    shortInsights: [
      {
        quote: "You do not rise to the level of your goals. You fall to the level of your systems.",
        tag: "Systems Thinking"
      },
      {
        quote: "Every action you take is a vote for the person you wish to become.",
        tag: "Identity"
      }
    ]
  },
  {
    id: "deep-work",
    title: "Deep Work",
    author: "Cal Newport",
    category: "Career & Focus",
    readTimeMin: 14,
    coverAccent: "#3B82F6",
    synopsis: "The ability to focus without distraction on a cognitively demanding task is the superpower of the 21st-century knowledge economy.",
    keyTakeaways: [
      "Deep Work is professional activities performed in a state of distraction-free concentration that push your cognitive capabilities to their limit.",
      "Shallow Work (emails, Slack chats, meetings) creates the illusion of productivity while depleting cognitive stamina.",
      "Attention residue: switching between tasks leaves mental residue that degrades cognitive bandwidth.",
      "The 4 Deep Work philosophies: Monastic, Bimodal, Rhythmic, and Journalistic."
    ],
    chapters: [
      {
        chapterIndex: 1,
        title: "The Deep Work Hypothesis",
        content: "The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable in our economy. As a consequence, the few who cultivate this skill, and then make it the core of their working life, will thrive. Deep work is necessary to wring every last drop of value out of your current intellectual capacity. We now know that to master complex skills rapidly and produce at an elite level, you must work for extended periods with full concentration on a single task free from distraction."
      },
      {
        chapterIndex: 2,
        title: "The Danger of Attention Residue",
        content: "When you switch from Task A to Task B, your attention does not immediately follow. A residue of your attention remains stuck thinking about the previous task. This is true even if you finish Task A before moving on, and especially severe if your work on Task A was unbounded and left incomplete. Checking your inbox or glancing at notifications for just 30 seconds introduces attention residue that significantly hampers your mental acuity for the next 15 to 25 minutes."
      },
      {
        chapterIndex: 3,
        title: "Rule #1: Work Deeply with Discipline",
        content: "Willpower is a finite resource that depletes as you use it. You cannot simply wait for inspiration or decide on a whim to focus. You must build rituals and routines around your deep work. Decide in advance: Where you'll work and for how long. How you'll work once you start (e.g., internet disconnected, metrics of words written). How you'll support your work (e.g., starting with coffee, quiet ambient lighting, clear desk)."
      },
      {
        chapterIndex: 4,
        title: "Rule #2: Embrace Boredom",
        content: "If every moment of potential boredom—such as waiting in line at a grocery store or sitting at a red light—is relieved with a quick glance at your smartphone, your brain has been rewired for constant novelty. It can no longer tolerate sustained focus. To succeed with deep work, you must train your mind to resist distracting stimuli. Schedule your internet use in advance rather than scheduling breaks from the internet."
      },
      {
        chapterIndex: 5,
        title: "Rule #3 & #4: Quit Social Media & Drain the Shallows",
        content: "Apply the Law of the Vital Few to your toolset: identify the core factors that determine success in your professional life, and adopt a tool only if its positive impacts substantially outweigh its negatives. Furthermore, ruthlessly cap shallow work. Treat 4 hours of intense, uninterrupted deep work as the ultimate daily ceiling for true cognitive output, and aggressively prune administrative trivia."
      }
    ],
    flashcards: [
      {
        id: "dw-fc-1",
        bookId: "deep-work",
        front: "What is 'Attention Residue' and why does checking email hurt deep work?",
        back: "Switching tasks leaves part of your attention trapped on the previous task. Even a 30-second check destroys focus for up to 20 minutes.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      },
      {
        id: "dw-fc-2",
        bookId: "deep-work",
        front: "What is the difference between Deep Work and Shallow Work?",
        back: "Deep Work: Distraction-free, cognitively demanding tasks that create new value. Shallow Work: Logistical, non-demanding tasks easily replicated.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      },
      {
        id: "dw-fc-3",
        bookId: "deep-work",
        front: "Why should you practice 'embracing boredom'?",
        back: "If your brain reaches for a phone at every idle second, it becomes addicted to novelty and loses the neurological capacity to sustain deep focus.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      }
    ],
    quiz: {
      scenario: "You are writing a complex technical report, but your team Slack ping sounds every 8 minutes with non-urgent operational updates.",
      options: [
        "Keep Slack open on a second monitor so you can reply in 30 seconds and quickly get back to writing.",
        "Close Slack completely, schedule two 20-minute communication blocks at 11 AM and 4 PM, and communicate this window to your team.",
        "Work with headphones while glancing at Slack only between paragraphs."
      ],
      correctIndex: 1,
      explanation: "Batching communication into designated shallow work blocks protects against cognitive fragmentation caused by continuous attention residue."
    },
    shortInsights: [
      {
        quote: "Clarity about what matters provides clarity about what does not.",
        tag: "Concentration"
      },
      {
        quote: "If you don't produce, you won't thrive—no matter how skilled or talented you are.",
        tag: "Output"
      }
    ]
  },
  {
    id: "psychology-of-money",
    title: "The Psychology of Money",
    author: "Morgan Housel",
    category: "Wealth & Finance",
    readTimeMin: 15,
    coverAccent: "#10B981",
    synopsis: "Doing well with money isn't necessarily about what you know. It's about how you behave. Timeless lessons on wealth, greed, and happiness.",
    keyTakeaways: [
      "Financial success is not a hard science; it's a soft skill where behavior trumps intelligence.",
      "Wealth is what you do not see: the cars not purchased, the watches not worn, the first-class upgrades declined.",
      "The highest form of wealth is the ability to wake up every morning and say, 'I can do whatever I want today.'",
      "Compounding only works if you give an asset uninterrupted years to grow without panicking during market drawdowns."
    ],
    chapters: [
      {
        chapterIndex: 1,
        title: "No One's Crazy",
        content: "Your personal experiences with money make up maybe 0.00000001% of what's happened in the world, but maybe 80% of how you think the world works. Someone who grew up during the Great Depression thinks about risk and reward in a way a tech executive raised in the 1990s cannot fathom. When people make financial decisions that look irrational to you, remember: no one is crazy. People make decisions based on the unique mental model of the world they formed from their lived experiences."
      },
      {
        chapterIndex: 2,
        title: "Luck & Risk: Twin Realities",
        content: "Luck and risk are the realization that every outcome in life is guided by forces other than individual effort. The world is too complex to allow 100% of your actions to dictate 100% of your outcomes. When someone succeeds wildly, be careful attributing it purely to genius. When someone fails, be slow to judge them as reckless. Focus less on specific individuals and extreme case studies, and more on broad, repeatable patterns."
      },
      {
        chapterIndex: 3,
        title: "Never Enough & The Goalpost Trap",
        content: "The hardest financial skill is getting the goalpost to stop moving. If your expectations rise in lockstep with your income, there is no logic in striving for more, because you will feel the same level of dissatisfaction regardless of your net worth. Modern capitalism excels at two things: generating wealth and generating envy. Comparing yourself to others is a game with no finish line."
      },
      {
        chapterIndex: 4,
        title: "Confounding Compounding",
        content: "Warren Buffett's skill is investing, but his secret is time. More than 99% of Warren Buffett's wealth was accumulated after his 50th birthday. If he had retired at 60 like a normal person, virtually no one would know his name. The secret to compounding isn't chasing the highest single-year returns—which usually involves fatal risks—it is achieving good returns that you can sustain for the longest possible duration."
      },
      {
        chapterIndex: 5,
        title: "Freedom: The True Dividend of Wealth",
        content: "The ability to do what you want, when you want, with who you want, for as long as you want, is the highest dividend money pays. Having control over your time is the single greatest predictor of happiness in positive psychology research. Tangible stuff does not deliver long-term happiness; autonomy does. Wealth provides you the flexibility to wait for good opportunities and weather unexpected crises without selling at the bottom."
      }
    ],
    flashcards: [
      {
        id: "pm-fc-1",
        bookId: "psychology-of-money",
        front: "What is Morgan Housel's core definition of 'Wealth'?",
        back: "Wealth is what you don't see. It is the money not spent, the cars not bought, the assets quietly compounding in the background.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      },
      {
        id: "pm-fc-2",
        bookId: "psychology-of-money",
        front: "What is Warren Buffett's greatest financial advantage?",
        back: "Time. Over 99% of his net worth came after age 50. Endurance and uninterrupted compounding beat chasing volatile short-term spikes.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      },
      {
        id: "pm-fc-3",
        bookId: "psychology-of-money",
        front: "What is the highest dividend money can pay in your life?",
        back: "Control over your time (Autonomy). The freedom to wake up and decide how your day will be spent.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      }
    ],
    quiz: {
      scenario: "Your portfolio drops 25% during a broader market correction. You have 3 years of cash reserves in an emergency fund.",
      options: [
        "Sell off your index funds immediately to prevent any further drawdown.",
        "Embrace market volatility as an admission fee for long-term compound growth and leave your index investments untouched.",
        "Borrow against your house to speculate on high-beta penny stocks."
      ],
      correctIndex: 1,
      explanation: "Market volatility is not a fine to be avoided; it is the price of admission for superior long-term returns. Uninterrupted compounding requires enduring drawdowns."
    },
    shortInsights: [
      {
        quote: "Spending money to show people how much money you have is the fastest way to have less money.",
        tag: "Status Trap"
      },
      {
        quote: "The ability to do what you want, when you want, for as long as you want, is priceless.",
        tag: "Autonomy"
      }
    ]
  },
  {
    id: "thinking-fast-and-slow",
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    category: "Psychology & Decision Making",
    readTimeMin: 16,
    coverAccent: "#EC4899",
    synopsis: "Nobel laureate Daniel Kahneman reveals the dual systems that drive how we think: System 1 (fast, intuitive, emotional) and System 2 (slow, deliberate, logical).",
    keyTakeaways: [
      "System 1 operates automatically and quickly, with little or no effort and no sense of voluntary control.",
      "System 2 allocates attention to effortful mental operations, including complex computations.",
      "WYSIATI (What You See Is All There Is): System 1 constructs coherent stories from limited evidence.",
      "Cognitive biases such as Anchoring, Loss Aversion, and Sunk Cost distort daily human decisions."
    ],
    chapters: [
      {
        chapterIndex: 1,
        title: "Two Systems of the Mind",
        content: "To understand human thought, imagine two agents inside your brain. System 1 operates automatically, intuitively, and effortlessly. It detects that one object is more distant than another, or answers 2 + 2 instantly. System 2, by contrast, is slow, deliberate, and effortful. It solves 17 × 24, navigates a crowded parking lot, or fills out a tax form. Most of what you think and do originates in System 1, but System 2 takes over when things get tricky and has the final say."
      },
      {
        chapterIndex: 2,
        title: "The Law of Cognitive Ease and WYSIATI",
        content: "System 1 is radically insensitive to both the quality and the quantity of the information that retrieves it. We call this rule WYSIATI: What You See Is All There Is. You cannot help dealing with the limited information you have as if there were nothing else to know. System 1 builds a quick story, and if the story is coherent, the brain experiences 'cognitive ease' and accepts it as truth. This makes us prone to jumping to conclusions and overestimating our understanding of the world."
      },
      {
        chapterIndex: 3,
        title: "Heuristics and Biases",
        content: "When faced with a difficult question, System 1 often answers an easier question instead, without you noticing the substitution. If asked, 'How satisfied are you with your life?', your brain might substitute, 'What is my mood right now?' We see this with Anchoring: presenting an initial number pulls subsequent estimates toward that anchor, regardless of its relevance. In negotiations or retail pricing, the first number spoken exerts an immense subconscious gravitational pull."
      },
      {
        chapterIndex: 4,
        title: "Loss Aversion & Prospect Theory",
        content: "In human evolutionary history, organisms that treated threats as more urgent than opportunities had a better chance to survive and reproduce. Consequently, the pain of losing $100 is psychologically about twice as intense as the pleasure of gaining $100. This is Loss Aversion. It explains why investors hold losing stocks too long (hoping to break even) while selling winning stocks too early."
      },
      {
        chapterIndex: 5,
        title: "The Experiencing Self vs. The Remembering Self",
        content: "Who are you: the person who lives through each moment, or the person who looks back and evaluates it? Kahneman demonstrates that our memories do not record the sum total of an experience. Instead, we evaluate past events based on the Peak-End Rule: the average of the most intense point (peak) and the final moments (end), largely ignoring duration. If you want pleasant memories of a vacation, ensure the finale is remarkable."
      }
    ],
    flashcards: [
      {
        id: "tfs-fc-1",
        bookId: "thinking-fast-and-slow",
        front: "What is WYSIATI (What You See Is All There Is)?",
        back: "System 1 forms immediate judgments based only on accessible information, ignoring unseen data or sample sizes.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      },
      {
        id: "tfs-fc-2",
        bookId: "thinking-fast-and-slow",
        front: "How does Loss Aversion affect human decision-making?",
        back: "Losses hurt roughly 2x as much as equivalent gains feel good. We take irrational risks to avoid locking in a guaranteed loss.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      },
      {
        id: "tfs-fc-3",
        bookId: "thinking-fast-and-slow",
        front: "What is the Peak-End Rule in human memory?",
        back: "We evaluate past experiences based on their emotional peak and their conclusion, largely ignoring the duration.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      }
    ],
    quiz: {
      scenario: "A real estate agent lists a home at $950,000, even though identical houses on the street sold for $820,000 last month. A buyer offers $890,000 thinking they got a bargain.",
      options: [
        "The buyer made a rational decision based on intrinsic property appraisal.",
        "The buyer fell victim to the Anchoring effect, as the inflated list price distorted their reference point.",
        "The buyer used System 2 slow statistical modeling."
      ],
      correctIndex: 1,
      explanation: "Anchoring bias: The high listing price set an arbitrary reference point, making an overpriced offer feel like a discount to System 1."
    },
    shortInsights: [
      {
        quote: "A reliable way to make people believe in falsehoods is frequent repetition, because familiarity is not easily distinguished from truth.",
        tag: "Cognition"
      },
      {
        quote: "Confidence is a feeling, which reflects the coherence of the information and the cognitive ease of processing it.",
        tag: "Intuition"
      }
    ]
  },
  {
    id: "diary-of-a-ceo",
    title: "The Diary of a CEO: 33 Laws of Business & Life",
    author: "Steven Bartlett",
    category: "Leadership & Life",
    readTimeMin: 15,
    coverAccent: "#8B5CF6",
    synopsis: "Distilled wisdom from hundreds of the world's most successful founders, scientists, and thinkers. A masterclass on self-mastery, storytelling, and high performance.",
    keyTakeaways: [
      "Fill your five buckets in order: Knowledge, Skills, Network, Resources, Reputation.",
      "The power of 1% marginal gains applies to emotional discipline and product friction.",
      "Friction is the silent killer of growth: minimize every superfluous step for your customers and yourself.",
      "Your psychological narrative determines your ceiling: reframe setbacks into diagnostic data."
    ],
    chapters: [
      {
        chapterIndex: 1,
        title: "The Five Buckets of Human Potential",
        content: "You possess five distinct buckets: 1. What you know (Knowledge), 2. What you can do (Skills), 3. Who you know (Network), 4. What you have (Resources / Capital), and 5. What the world thinks of you (Reputation). The crucial law is that you must fill them in this exact order. If you try to jump straight to Resources without Knowledge and Skills, your success is fragile and easily wiped out. When you invest obsessively in your first two buckets, the remaining three fill up automatically."
      },
      {
        chapterIndex: 2,
        title: "You Must Never Disagree with Reality",
        content: "When reality conflicts with your expectations, reality always wins. Denial, anger, and wishing things were different consume immense psychological energy without altering an atom of the physical world. The world's highest performers practice radical acceptance: they observe facts dispassionately, treat failures as diagnostic data, and adapt instantly. Blaming circumstances makes you a passenger; taking responsibility makes you the driver."
      },
      {
        chapterIndex: 3,
        title: "Friction: The Invisible Growth Destroyer",
        content: "Every additional click, every extra form field, every subtle barrier between a human and their intended action causes catastrophic drop-off. The same law governs your personal habits. If going to the gym requires looking for clean socks, hunting for keys, and driving in heavy traffic, you won't go. Reduce friction to zero for positive actions, and introduce intentional friction for destructive behaviors."
      },
      {
        chapterIndex: 4,
        title: "The Power of Negative Manifestation",
        content: "Optimism is crucial for vision, but paranoid anticipation of failure is required for survival. The Stoics called this premeditatio malorum: premeditation of evils. Ask yourself: If this project collapses in six months, what was the exact cause? By conducting a 'pre-mortem' before launching, you inoculate your strategy against foreseeable disasters and build durable contingencies."
      },
      {
        chapterIndex: 5,
        title: "The Law of the Sweat Drop",
        content: "Nothing worth having comes without leaning into discomfort. Your brain is wired for homeostatic survival, urging you to conserve energy and retreat to safety whenever things feel difficult. High performance is simply the learned discipline of recognizing that signal and taking one more step forward. Comfort is the enemy of mastery."
      }
    ],
    flashcards: [
      {
        id: "doac-fc-1",
        bookId: "diary-of-a-ceo",
        front: "What are the 5 Buckets and in what order must they be filled?",
        back: "1. Knowledge, 2. Skills, 3. Network, 4. Resources, 5. Reputation. Never skip straight to Resources.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      },
      {
        id: "doac-fc-2",
        bookId: "diary-of-a-ceo",
        front: "What is a 'Pre-Mortem' and why is it essential?",
        back: "Assume the project has already failed 6 months in the future, and diagnose the root causes in advance to prevent them.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      },
      {
        id: "doac-fc-3",
        bookId: "diary-of-a-ceo",
        front: "How does friction dictate human behavior?",
        back: "Humans will always flow along the path of least resistance. Eliminate friction for constructive habits; insert friction for bad habits.",
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: new Date().toISOString()
      }
    ],
    quiz: {
      scenario: "You have a modest amount of savings and want to build a sustainable tech career. A flashy influencer advises you to spend it on luxury clothes and VIP networking dinners to look wealthy.",
      options: [
        "Follow the advice to fake reputation before acquiring skills.",
        "Reject the advice: invest your time and capital directly into Knowledge and Skills (Buckets 1 & 2), which make Network and Reputation inevitable.",
        "Buy lottery tickets."
      ],
      correctIndex: 1,
      explanation: "Law 1: Fill the buckets in order. Knowledge and Skills build real leverage; faking Reputation without competence leads to rapid collapse."
    },
    shortInsights: [
      {
        quote: "If you don't discipline your mind, someone else will.",
        tag: "Self-Mastery"
      },
      {
        quote: "Knowledge is knowing what to do. Wisdom is doing it.",
        tag: "Execution"
      }
    ]
  }
];
