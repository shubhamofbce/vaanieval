"""Generate a multi-speaker sample dialogue audio using Deepgram TTS.

Synthesizes each line of a scripted conversation with a distinct Deepgram
Aura-2 voice, then stitches the clips together (with short pauses) into a
single audio file via ffmpeg.

Transcript: a full system-design-interview lecture given by Radha (the
teacher), with four students -- Abhishek, Ajay, Harsh, and Prince -- each
asking one question inline.

Voice/accent note: Deepgram's Aura-2 catalog does not currently offer an
Indian English accent (only American, British, Australian, and Filipino
accents are available). As agreed with the user, British accent voices are
used here as the closest available stand-in:
  - Radha (female teacher)        -> aura-2-pandora-en (feminine, en-gb)
  - All four male students        -> aura-2-draco-en   (masculine, en-gb)
    (draco is the only non-American male voice with a British accent, so
    all four students share it -- there isn't a second distinct British
    male voice in Aura-2 today.)

This is a demo/sample generator, not a general-purpose tool: the dialogue
script and the DIALOGUE list below are meant to be edited directly for each
new sample rather than driven by CLI flags.

Usage:
    python -m scripts.generate_dialogue_audio -o system_design_lecture.mp3

Requires: DEEPGRAM_API_KEY (via .env, see generate_tts_audio.py) and ffmpeg
on PATH.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from generate_tts_audio import resolve_api_key, synthesize  # noqa: E402

# (speaker label, Deepgram voice model, line of dialogue)
DIALOGUE: list[tuple[str, str, str]] = [
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Hello everyone. Hmmm. Welcome to this session on how to approach a system design '
        'question in an interview.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Today, I do not want to teach you how to memorize the design of WhatsApp, Netflix, Uber, '
        'or YouTube. Those examples are useful, of course, but memorizing them is not the real '
        'skill. The real skill is learning how to think when the question is vague, when the '
        'requirements are incomplete, and when there are many technically valid answers. Hmmm. '
        'That is what system design interviews are really testing.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'By the end of this session, you should have a repeatable framework. A framework that you '
        'can use whether the interviewer asks you to design a URL shortener, a chat application, '
        'an e-commerce platform, a ride-sharing app, a file storage system, or a news feed. You '
        'may not know every database or every distributed systems concept. That is okay. A good '
        'approach will still help you communicate clearly, make sensible tradeoffs, and show '
        'structured thinking.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Let us begin with an important mindset shift. In a coding interview, there is often a '
        'correct algorithm, or at least a relatively narrow range of correct algorithms. In '
        'system design, there is rarely one perfect answer. There are many reasonable designs. '
        'The interviewer is not expecting you to build all of Google in forty-five minutes. They '
        'are trying to understand how you break down an ambiguous problem. They want to see '
        'whether you ask useful questions, whether you can identify the important constraints, '
        'whether you understand scale, and whether you can explain why you chose one solution '
        'over another.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'So when you hear the question, do not panic and start drawing boxes immediately. Hmmm. '
        'That is one of the most common mistakes. People hear, design Instagram, and immediately '
        'say, we need microservices, Kafka, Redis, Cassandra, CDN, Kubernetes, and a load '
        'balancer. That may sound impressive for ten seconds. But it is not a design. It is a '
        'shopping list of technologies. A system design interview is not about saying the most '
        'fashionable words. It is about making the right decisions for the problem in front of '
        'you.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The approach I will share today has seven stages. First, clarify the problem. Second, '
        'define functional and non-functional requirements. Third, estimate scale. Fourth, sketch '
        'the high-level architecture. Fifth, design the data model and storage choices. Sixth, '
        'deep dive into the critical path. And seventh, discuss bottlenecks, tradeoffs, '
        'reliability, and future improvements. We will walk through all seven stages slowly.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Before we go deeper, let us understand why clarification is so important. Imagine the '
        'interviewer says, design a messaging application. That is an enormous problem. Is it one '
        'to one messaging, or group messaging? Are messages text only, or do they include photos '
        'and video? Do we need read receipts? Do we need message search? Do users expect messages '
        'to arrive in less than one second? Do messages need end to end encryption? How large can '
        'groups become? Is this for a small office team or for hundreds of millions of users '
        'worldwide? Every one of these answers changes the design.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Therefore, your first response should sound calm and deliberate. You can say something '
        'like this. Before I start designing, I would like to clarify the scope and prioritize '
        'the requirements. Are we focusing on a global scale product, and which core user flows '
        'matter most for this interview? Hmmm. This is not a delay tactic. It is professional '
        'problem solving. In real engineering, unclear requirements create incorrect systems. '
        'Good engineers reduce ambiguity early.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Let us talk about the first stage in detail. Clarify the problem.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'When you receive the prompt, spend roughly three to five minutes asking questions. You '
        'do not need to ask twenty questions. Ask only questions that change the design. I '
        'usually group them into four categories.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The first category is users and use cases. Who uses the system, and what are the top '
        'actions they perform? If you are designing a food delivery app, the actors might be '
        'customers, restaurants, and delivery partners. The most important flows might be '
        'browsing restaurants, placing an order, restaurant acceptance, delivery tracking, and '
        'payment. You do not need to cover employee dashboards, refund workflows, promotions, '
        'loyalty points, and every possible edge case on day one. State that you will prioritize '
        'the most important flows first.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The second category is scale. Ask about the number of users, daily active users, '
        'concurrent users, expected growth, and geographic distribution. Even if the interviewer '
        'does not give exact numbers, you can make assumptions out loud. For example, I will '
        'assume ten million daily active users, one million concurrent users at peak, and a '
        'global audience. Then ask the interviewer if that is a reasonable scale. This matters '
        'because a design for ten thousand users can be much simpler than a design for one '
        'hundred million users.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The third category is consistency and latency. Ask questions like, is it acceptable for '
        'a user to see slightly stale data, or must every update be immediately visible '
        'everywhere? What response time should the system target? For a payment system, '
        'correctness and strong consistency are critical. For a social media feed, showing a post '
        'a few seconds later is usually acceptable. This distinction influences database choices, '
        'caching strategy, and replication behavior.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The fourth category is constraints and exclusions. Do we need to handle multimedia? Do '
        'we need privacy or regulatory requirements? Is the question asking for an application '
        'programming interface, an architecture, or a detailed database schema? It is completely '
        'acceptable to say, for this discussion I will focus on the backend design and treat '
        'authentication and billing as existing platform services, unless you would like me to '
        'include them. Hmmm. This shows that you can control scope rather than getting lost.',
    ),
    (
        'Abhishek (Student)',
        'aura-2-draco-en',
        'Hi Radha, I am Abhishek and I have a quick question. How many clarification questions '
        'should we ask before we start designing?',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'That is a very good question, Abhishek. There is no fixed number. Usually, three to six '
        'high-value questions are enough. Ask questions only when their answers will change your '
        'design. If you are still asking broad questions after five minutes, summarize your '
        'assumptions and begin. For example, you can say, I will assume a global product with ten '
        'million daily active users, and I will focus on the core creation and read flow. Then '
        'move ahead confidently.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Here is a practical phrase you can use in almost every interview. I will start by '
        'confirming the core use cases, then I will estimate scale, propose a high-level design, '
        'and finally deep dive into the areas that are most important for scale and reliability. '
        'This tells the interviewer that you have a plan. It also makes the conversation easier '
        'to follow.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Now let us move to the second stage. Define requirements.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Requirements are generally of two kinds. Functional requirements describe what the '
        'system must do. Non-functional requirements describe how well it must do it.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'For example, if we are designing a URL shortener, functional requirements could be: a '
        'user can submit a long URL and receive a short URL; a user can visit the short URL and '
        'be redirected to the original URL; and optionally, users can see click analytics. Notice '
        'how concise this is. Do not try to turn the requirement list into a product '
        'specification.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Non-functional requirements could be: redirects should be very fast; the system should '
        'be highly available; generated short URLs should be unique; the system should support a '
        'large number of reads; and analytics can be eventually consistent. Hmmm. Those '
        'statements immediately guide architecture.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'A very useful habit is to say which requirements are in scope and which are not. For the '
        'URL shortener, you might say, I will focus on URL creation and redirection. I will '
        'mention analytics later as an asynchronous extension. This is important because '
        'interviews have a time limit. Senior candidates do not try to solve everything. They '
        'prioritize.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Let us pause for a moment. Suppose I ask you to design a file-sharing system like Google '
        'Drive. What would be the functional requirements? Hmmm. You might say upload a file, '
        'download a file, list files, share a file with another user, and synchronize file '
        'changes across devices. What would be non-functional requirements? Large files should '
        'upload reliably, downloads should be fast, files should be durable, permissions must be '
        'enforced, and users should not lose data. This is how you convert a vague product name '
        'into engineering goals.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Now stage three. Capacity estimation. This is where many people become nervous because '
        'they think they must perform perfect mathematics. You do not. You need rough order of '
        'magnitude thinking. Estimates help you decide whether a single database is enough, '
        'whether caching matters, whether object storage is needed, and whether partitioning will '
        'eventually be required.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Let us use the URL shortener example. Assume one hundred million new URLs are created '
        'every month. That is roughly three million per day. Divide that by eighty-six thousand '
        'four hundred seconds in a day, and we get around thirty-five writes per second on '
        'average. At peak, perhaps ten times that number, so around three hundred and fifty '
        'writes per second.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Now assume every short URL is accessed one hundred times on average. That means three '
        'hundred million redirects per day, or a few thousand reads per second on average, '
        'perhaps tens of thousands at peak. Immediately we see a read-heavy system. Hmmm. That '
        'tells us caching is probably valuable.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'You do not need to say every calculation with exact precision. You can say, I am using '
        'rough estimates to understand the shape of the problem. We expect far more reads than '
        'writes, so I will optimize the redirect path for low latency. That sentence is often '
        'more valuable than the arithmetic itself.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'There are a few estimation patterns worth remembering. Requests per second equals total '
        'requests divided by seconds in the relevant period. Storage equals number of records '
        'multiplied by average record size multiplied by retention period. Bandwidth equals '
        'requests per second multiplied by average payload size. Cache size depends on the '
        'fraction of frequently accessed data you want to keep in memory. If you know these four '
        'patterns, you can reason through most interview questions.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'For example, if each URL mapping uses one kilobyte including metadata and indexes, and '
        'you create one hundred million mappings per month, then you add roughly one hundred '
        'gigabytes each month. That is not tiny, but it is manageable with modern distributed '
        'storage. If analytics events are much larger in volume, you may store them separately '
        'from the mapping table. That is a key lesson. Different data may have different access '
        'patterns, consistency needs, and storage requirements.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Do not overdo estimation either. Spending fifteen minutes calculating decimals is not a '
        'strong interview performance. The goal is to extract a design implication. Say the '
        'number, say the implication, and move forward.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Now we arrive at stage four, the high-level architecture. This is the moment most people '
        'think of as system design. But because we clarified requirements and scale first, the '
        'architecture now becomes much easier.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'For a typical internet service, a basic high-level design might include clients, a '
        'domain name service, a content delivery network for static content when relevant, a load '
        'balancer, stateless application servers, caches, databases, asynchronous queues, '
        'background workers, and monitoring. But again, do not draw every component '
        'automatically. Introduce a component only when you can explain its job.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Let us design the URL shortener at a high level. A client sends a request to create a '
        'short URL. The request reaches a load balancer, which routes it to one of many '
        'application servers. The application server validates the input, generates a unique '
        'short code, and stores the mapping between the short code and the original URL in a '
        'durable database. It returns the short URL to the client.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'For redirection, a browser requests the short URL. The request reaches the load balancer '
        'and an application server. The server first looks for the short code in a cache. If it '
        'finds it, it redirects immediately. If it does not find it, it reads the mapping from '
        'the database, stores it in the cache for future requests, and redirects the browser. At '
        'the same time, it can publish a click event to a queue for analytics processing. Notice '
        'that analytics does not delay the redirect. This protects the user experience.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'This design contains a powerful general pattern. Keep the user-facing critical path '
        'short and reliable. Move slower, non-critical work to asynchronous processing. Hmmm. '
        'Examples of non-critical work include analytics, sending notifications, generating '
        'thumbnails, updating recommendations, indexing search documents, and producing reports.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'If the interviewer asks why we need a queue, do not simply say because queues are '
        'scalable. Explain the reason. A queue absorbs traffic spikes, separates the redirect '
        'service from analytics processing, allows retries if the analytics service fails, and '
        'prevents a failure in reporting from slowing down redirects. The tradeoff is eventual '
        'consistency. Click counts may take a few seconds or minutes to appear. For analytics, '
        'that is normally acceptable.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Now, a short note on stateless services. In an interview, you will often say that '
        'application servers are stateless. That means any server can handle any request because '
        'session information is not kept only in the local memory of one server. This makes '
        'horizontal scaling easier. If traffic grows, we add more servers behind the load '
        'balancer. If one server fails, another server can handle requests. User session state, '
        'if needed, should be stored in a shared service such as a database, a distributed cache, '
        'or a signed token.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'There is a tradeoff. Stateless services simplify scaling and recovery, but shared state '
        'systems become important dependencies. As the system grows, you must manage their '
        'capacity, availability, and security carefully. Mentioning that tradeoff shows mature '
        'thinking.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Now stage five. Data model and storage selection.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Interviewers often want to know whether you can choose a database based on the data and '
        'queries, rather than choosing a database based on popularity. Start with the access '
        'patterns. What data is stored? What are the primary reads and writes? Do we query by '
        'key, filter on multiple fields, search text, traverse relationships, or process '
        'time-based events?',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'For the URL shortener, the core table may be very simple. The short code is the primary '
        'key. The values include the original URL, creation time, expiration time if applicable, '
        'owner identifier, and perhaps a status flag. The primary operation is a lookup by short '
        'code. This is a key value access pattern. A relational database, a distributed key value '
        'store, or a wide-column database could all work, depending on scale and operational '
        'needs.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'If we use a relational database initially, we gain strong transactional behavior, '
        'familiar tooling, and easy administration. The downside is that a single primary '
        'database eventually becomes a scaling or availability constraint. We can add read '
        'replicas for read traffic, but writes still depend on the primary. At much larger scale, '
        'we may shard or partition the data by short code. The downside of sharding is '
        'operational complexity. Queries across shards become harder, rebalancing data is more '
        'difficult, and debugging becomes more complex. Do not propose sharding on minute one if '
        'the estimated load does not require it.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'This leads to an important interview principle. Start with the simplest design that '
        'meets current requirements, then explain how it evolves as scale increases. Real systems '
        'are not born as perfect globally distributed architectures. They evolve. Hmmm.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Let us talk about identifiers, because this is a common deep dive. How do we generate '
        'unique short codes? One approach is to use an auto-incrementing numeric identifier and '
        'encode it using base sixty-two characters. Base sixty-two includes lowercase letters, '
        'uppercase letters, and digits. A seven-character base sixty-two code supports a very '
        'large number of combinations. This approach is compact and collision-free if the source '
        'identifier is unique.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'But there are tradeoffs. A simple sequential identifier can make codes predictable. If '
        'predictability is a concern, we can scramble the identifier before encoding or use a '
        'separate random generation strategy. Random codes are harder to guess but require '
        'collision handling. A distributed identifier generator can avoid a central bottleneck '
        'but adds complexity around clock behavior, worker identifiers, and operations. In an '
        'interview, explain the option you choose, explain why, and mention one alternative. That '
        'is enough.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The same thought process applies everywhere. For a chat system, messages are typically '
        'retrieved by conversation and time, so you may partition data by conversation identifier '
        'and sort by message timestamp. For an e-commerce catalog, you may read products by '
        'product identifier and search by category or text, so you could use a primary database '
        'plus a search index. For a social network, relationships may be modeled separately from '
        'posts because following users and fetching posts have different queries.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Now let us discuss caching, because it appears in almost every design interview. A cache '
        'stores frequently accessed data closer to the application so requests can be served '
        'faster and with less pressure on the database. Typical cached data includes user '
        'profiles, product information, URL mappings, session data, popular feed items, and '
        'configuration.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'When discussing a cache, answer four questions. What do we cache? Where is the cache '
        'checked? How is it updated or invalidated? And what happens when it fails?',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'For our URL shortener, we use a cache-aside pattern. The application checks the cache '
        'first. On a cache miss, it reads the database and adds the result to the cache. If a '
        'mapping is edited or disabled, the application updates the database and invalidates or '
        'updates the corresponding cache entry. The cache uses a time to live so stale entries '
        'eventually disappear.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The cache improves latency and protects the database during heavy reads. The downside is '
        'that cache invalidation is difficult. A user might briefly see stale data after an '
        'update. Also, if a very popular key expires, many requests can hit the database at once. '
        'This is called a cache stampede. We can reduce that risk with staggered expiration, '
        'request coalescing, or allowing one request to refresh the value while others use a '
        'slightly stale value.',
    ),
    (
        'Ajay (Student)',
        'aura-2-draco-en',
        'Hi Radha, I am Ajay and I have a quick question. If a cache can show old data, why do we '
        'use it in an important system?',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Good question, Ajay. We use a cache only where brief staleness is acceptable, or where '
        'the database remains the final source of truth. For example, it is usually okay if a '
        'product image or social media profile takes a few seconds to refresh. It is not okay to '
        'rely only on cached information for a final payment or a scarce ticket reservation. In '
        'those cases, the final validation must go to the authoritative system. So caching is not '
        'about replacing correctness. It is about accelerating safe reads.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'As the system grows, caching can introduce memory cost and operational complexity. It '
        'can also hide inefficient database queries for a while. So the best design is not always '
        'to cache everything. Cache data that is read frequently, expensive to compute, and safe '
        'to serve slightly stale when necessary.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Now, I want to introduce a crucial topic. Consistency versus availability. You do not '
        'need to turn the interview into a theoretical lecture on the CAP theorem. But you should '
        'be able to make practical statements about the tradeoff.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Suppose a user changes their profile photo. It is usually acceptable if someone in '
        'another region sees the old photo for a few seconds. That is eventual consistency. We '
        'can replicate data asynchronously and gain better performance and availability.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Now suppose a user transfers money from one bank account to another. It is not '
        'acceptable for the sender to see a completed transfer while the receiver system has lost '
        'the transaction. We need stronger correctness guarantees, idempotency, durable records, '
        'and carefully controlled transactions. This may cost latency and reduce availability '
        'during failures. Hmmm. The important question is not, should every system be strongly '
        'consistent? The question is, which operations require it?',
    ),
    (
        'Harsh (Student)',
        'aura-2-draco-en',
        'Hi Radha, I am Harsh and I have a quick question. Why not simply use one database for '
        'everything and make all data strongly consistent?',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'That can be a sensible starting point for a smaller product, Harsh. The downside is that '
        'making every operation strongly consistent can increase latency, limit availability '
        'during network or region failures, and make global scaling expensive. Many features do '
        'not need that level of coordination. If we apply the strongest guarantee everywhere, we '
        'pay the cost everywhere. Good system design applies stronger consistency only to the '
        'operations where an incorrect result would cause real harm.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'In an interview, label the consistency needs of the data. For example, in an inventory '
        'system, preventing overselling a scarce item may require strong consistency during '
        'checkout, while the product description and reviews can be eventually consistent. In a '
        'messaging system, message ordering within one conversation may matter, while global '
        'ordering across all conversations does not. Clear boundaries like this make your design '
        'credible.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Now we reach stage six. The deep dive. A system design interview cannot explore every '
        'component equally. After you draw the high-level architecture, choose the two or three '
        'components where the design is most interesting or risky. You can ask the interviewer, '
        'would you like me to go deeper on data partitioning, the real-time delivery path, or '
        'reliability? Hmmm. This is a very good move because it makes the interview '
        'collaborative.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'What should you deep dive into? Usually, choose the highest-volume path, the most '
        'consistency-sensitive operation, or the technically distinctive feature. For YouTube, it '
        'may be video upload and streaming. For Uber, it may be matching drivers with riders and '
        'location updates. For a chat system, it may be real-time message delivery and offline '
        'synchronization. For a payment system, it may be idempotent transaction processing. For '
        'a news feed, it may be feed generation.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Let us use a social media news feed as an example because it teaches a classic tradeoff. '
        'Imagine a user follows many other users and wants to see recent posts from them. We have '
        'two broad choices. Fan-out on write means that when a user creates a post, we '
        'immediately write a reference to that post into the feeds of their followers. Then '
        'reading a feed is fast because it is already assembled. Fan-out on read means that when '
        'a user opens their feed, we fetch recent posts from all the people they follow and merge '
        'them at read time.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Fan-out on write works well when users have a manageable number of followers and feed '
        'reads must be fast. The downside is write amplification. One post from a user with ten '
        'million followers could create ten million feed updates. Fan-out on read reduces that '
        'write work but makes feed reads slower and more complex. A practical system may use a '
        'hybrid approach. Normal users use fan-out on write, while celebrity accounts use fan-out '
        'on read. Hmmm. This is what a good tradeoff discussion sounds like. There is no magic '
        'database that removes the underlying cost. You decide where to pay it.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Another useful deep dive is handling duplicate requests. Distributed systems have '
        'retries. A mobile device may lose connectivity after sending a request. The user may '
        'press a button twice. A load balancer may retry after a timeout. If the operation '
        'creates an order or charges a card, duplicates are dangerous.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The solution is idempotency. An idempotent operation can be repeated without changing '
        'the result beyond the first successful execution. In a payment API, the client sends an '
        'idempotency key with the request. The server stores the key and the completed result. If '
        'the same request arrives again, the server returns the previous result instead of '
        'charging again. This is a small detail that signals real production experience.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Now let us talk about reliability. Systems fail. Servers fail, networks fail, databases '
        'become slow, deployments introduce bugs, third-party services time out, and users behave '
        'in unexpected ways. A good design acknowledges this calmly.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Start with redundancy. Instead of one application server, use several. Instead of one '
        'database node, use replication. Instead of one availability zone, use multiple zones '
        'where the scale and business value justify it. Use health checks so the load balancer '
        'stops sending traffic to unhealthy servers. Make services restartable and deploy them '
        'gradually.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Then discuss timeouts, retries, and circuit breakers. Every remote call should have a '
        'timeout. Without timeouts, a slow dependency can consume all available threads or '
        'connections and cause a cascading failure. Retries can help temporary failures, but '
        'retries can also make an overloaded system worse. Use limited retries with exponential '
        'backoff and jitter. For unsafe operations, use idempotency keys. A circuit breaker '
        'temporarily stops calls to a failing service, allowing it time to recover and protecting '
        'the caller.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The tradeoff is complexity. Each resilience feature must be tested and monitored. At '
        'small scale, too much machinery can slow development and create new failure modes. At '
        'large scale, not having these protections can turn a minor outage into a major incident. '
        'Say this distinction clearly.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Observability is another topic that often separates a sketch from an operational design. '
        'If users report that the application is slow, how will engineers know why? We need '
        'metrics, logs, and traces. Metrics tell us request rate, error rate, latency, cache hit '
        'rate, queue depth, database connections, and resource utilization. Logs record useful '
        'events and errors, without leaking private data. Distributed traces follow a request '
        'across multiple services.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'You do not need to design a full monitoring platform. Just say that we will define '
        'service level indicators such as successful redirects, p ninety-nine latency, error '
        'rate, and queue processing delay. We will alert on sustained degradation. Hmmm. That is '
        'a mature and concise answer.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Security should also appear in your design, especially when the system handles user '
        'data, money, files, or private communication. Mention authentication, authorization, '
        'encryption in transit, encryption at rest where appropriate, rate limiting, audit logs '
        'for sensitive actions, and secure handling of secrets. Do not merely say security is '
        'important. Tie it to the flow.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'For example, in a file-sharing service, every download request must check whether the '
        'authenticated user is authorized to access that file. File links may use short-lived '
        'signed URLs. Uploaded files should be scanned or isolated before being shared. In a URL '
        'shortener, abuse prevention matters because attackers may create malicious links. We may '
        'rate limit creation, scan suspicious destinations, and maintain block lists. Security '
        'requirements bring operational cost and some extra latency, but ignoring them can create '
        'far greater risk as usage grows.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Let us now discuss how to communicate during the interview. This is as important as '
        'technical knowledge. Draw or describe your design in layers. Start with the user flow. '
        'Then add the main services. Then add storage and asynchronous processing. Finally, zoom '
        'into one part. Every time you add a box, say what it does and why it exists.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Avoid silent drawing. The interviewer cannot evaluate thoughts that you do not express. '
        'You might say, I am placing a cache in front of the database because redirects are '
        'read-heavy and the mapping is small. Or, I am using object storage rather than a '
        'relational database for raw video files because object storage is designed for durable, '
        'large binary data and can integrate with a content delivery network.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Also avoid claiming absolute answers. Instead of saying, we must use NoSQL, say, because '
        'our primary access pattern is lookup by key and we expect high write volume, a '
        'distributed key value store would be a good fit. A relational database remains a '
        'reasonable starting point if the scale is lower and transactional queries are valuable. '
        'This language shows judgment.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'When you make an assumption, state it. When you are uncertain, reason from first '
        'principles. It is much better to say, I have not worked directly with this particular '
        'technology, but the requirement here is ordered durable event processing, so I would '
        'choose a queue or log system that provides partitioned ordering and replay capability. '
        'The interviewer is looking for reasoning, not a performance of omniscience.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Let us now walk through a complete mini-example. Imagine the prompt is, design an online '
        'ticket booking system for concerts.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'I would begin by saying, I will focus on browsing events, viewing available seats, '
        'reserving a seat, completing payment, and issuing a ticket. I will assume high traffic '
        'when popular tickets are released, and I will treat recommendations and marketing '
        'notifications as out of scope for now.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Then I would identify the most important requirement. We must not sell the same seat to '
        'two people. That immediately becomes the critical consistency requirement. Browsing '
        'seats can use cached data and may be slightly stale, but reservation and purchase need '
        'careful coordination.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The high-level design could include an event catalog service, a seat inventory service, '
        'a booking service, a payment service integration, a ticket service, a cache, a '
        'transactional database, and a queue for sending confirmation emails. Clients browse '
        'event and seat information through the catalog and inventory services. When a user '
        'chooses a seat, the booking service attempts to place a short-lived hold on that seat. '
        'The payment happens only while the hold is valid. If payment succeeds, the hold becomes '
        'a confirmed booking. If payment fails or the hold expires, the seat becomes available '
        'again.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The deep dive is the seat hold. We need an atomic way to change a seat from available to '
        'held only if it is still available. In a relational database, this may be implemented '
        'with a conditional update or a transaction that checks the current state. The database '
        'record includes the seat identifier, event identifier, state, hold expiration time, and '
        'booking identifier. A background process releases expired holds. The payment request '
        'includes an idempotency key so retries do not create duplicate charges or duplicate '
        'tickets.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'We also need to consider oversell protection during a traffic spike. A cache alone '
        'should not be the source of truth for final availability because cache updates can be '
        'delayed. We may use the cache for browsing, but the database or inventory service must '
        'make the final atomic reservation. The tradeoff is that the reservation path may have '
        'more latency than browsing, but correctness is worth it. Hmmm.',
    ),
    (
        'Prince (Student)',
        'aura-2-draco-en',
        'Hi Radha, I am Prince and I have a quick question. What happens if two people click the '
        'same seat at almost exactly the same time?',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Excellent question, Prince. Both requests may initially see the seat as available, '
        'especially if they are viewing cached data. But when they attempt to reserve it, the '
        'authoritative inventory system performs one atomic conditional update. Only the request '
        'that successfully changes the seat from available to held wins. The other request '
        'receives a response saying that the seat was just taken and can select another one. This '
        'is why the final booking decision cannot rely on the screen or on a stale cache.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Notice how this answer is not about naming ten tools. It is about identifying the '
        'dangerous failure mode and designing the critical state transition correctly.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Now I want to share common mistakes and how to recover from them.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The first mistake is designing before clarifying. Recovery is simple. Pause and say, '
        'before I go further, I want to confirm the scale and the primary use case. It is never '
        'too late to clarify.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The second mistake is spending too long on a single component. For example, explaining '
        'every field of every database table before the interviewer understands the architecture. '
        'Recovery is to zoom out. Say, I will first complete the end-to-end flow, then return to '
        'the schema for the booking path.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The third mistake is adding technology without a reason. If you say Kafka, Redis, or '
        'Kubernetes, be ready to explain the requirement it solves and the cost it introduces. If '
        'you cannot explain it, leave it out.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The fourth mistake is ignoring failure cases. At minimum, ask, what happens if this '
        'dependency is unavailable, if the request is retried, if the consumer is slow, or if a '
        'region fails? You do not need a perfect disaster recovery plan. You just need to show '
        'that the happy path is not the whole system.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'The fifth mistake is failing to close the interview. In the final few minutes, '
        'summarize. Say, to recap, I optimized the design for this core flow, used this storage '
        'approach for these access patterns, used asynchronous processing for non-critical work, '
        'and protected the most sensitive operation with these consistency guarantees. If we had '
        'more time, I would explore multi-region replication, cost optimization, and abuse '
        'prevention. This leaves a clear final impression.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Let us spend a few minutes on a practical time plan for a forty-five minute interview. '
        'Use the first five minutes for clarification and requirements. Use the next five minutes '
        'for scale estimates and key constraints. Use ten minutes for the high-level design and '
        'end-to-end flow. Use fifteen minutes for the deepest technical component. Use the final '
        'ten minutes for bottlenecks, failures, tradeoffs, security, and interviewer questions. '
        'This is not rigid. If the interviewer wants to dive into one topic early, follow them. '
        'But having a mental clock prevents you from spending half the interview on introductory '
        'questions.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'For a thirty minute interview, compress it. Spend three minutes clarifying, four minutes '
        'estimating, eight minutes on the architecture, ten minutes on the critical deep dive, '
        'and five minutes on tradeoffs and summary. Hmmm. The exact split is less important than '
        'moving from broad to deep in a controlled way.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Now, here is a compact framework you can memorize. First, clarify the users, core flows, '
        'scale, latency, and consistency needs. Second, state functional and non-functional '
        'requirements. Third, estimate traffic, storage, and bandwidth at a rough level. Fourth, '
        'propose the main components and explain the data flow. Fifth, choose storage based on '
        'access patterns. Sixth, deep dive into the hardest part. Seventh, discuss scaling, '
        'reliability, security, monitoring, and tradeoffs. Finally, summarize.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Let us make this even more concrete with phrases you can use. To start, I would like to '
        'clarify the primary user journey and expected scale. I will make a few assumptions and '
        'please correct me if needed. The critical path here is this request, so I will optimize '
        'it for low latency and correctness. This data is read frequently and changes '
        'infrequently, so caching is appropriate. This work is not required before responding to '
        'the user, so I will process it asynchronously. This operation can be retried, so I will '
        'make it idempotent. At higher scale, the primary bottleneck will be this database '
        'partition or this hot key. The tradeoff in this approach is complexity versus lower '
        'latency. These phrases help you express architecture in a clear, confident way.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'One more important point. System design is not just scaling. A system can have only a '
        'few users and still require good design because of privacy, correctness, workflow '
        'complexity, or reliability. Conversely, a large-scale system may be straightforward if '
        'its data model and user flow are simple. Do not treat every question as a distributed '
        'systems contest. First understand what failure would hurt the business or the user most. '
        'Then design around it.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'As you prepare for interviews, practice with a small set of different problem types. '
        'Practice one read-heavy system, such as a URL shortener or news feed. Practice one '
        'write-heavy or event-driven system, such as logging or chat. Practice one '
        'consistency-critical system, such as ticket booking or payments. Practice one media '
        'system, such as video upload or file storage. And practice one real-time location or '
        'matching system, such as ride sharing. The aim is not to memorize five answers. It is to '
        'notice the patterns that repeat.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'After each practice session, review yourself. Did I clarify the scope? Did I state '
        'assumptions? Did I connect estimates to decisions? Did I explain each component? Did I '
        'name a tradeoff? Did I cover what happens when things fail? Did I leave time to '
        'summarize? Recording yourself can be surprisingly helpful. You may discover that you '
        'know the concepts but rush through them, or that you explain database choices before '
        'explaining the user flow.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Let us close with the main idea. A strong system design interview answer is a guided '
        'conversation. You take an ambiguous problem, make it concrete, identify what matters '
        'most, create a simple architecture, and evolve it thoughtfully as requirements grow. You '
        'show that you understand tradeoffs. You do not pretend every system needs the same '
        'technologies. You do not try to solve everything at once. Hmmm. You make sensible '
        'decisions and explain them clearly.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'When you next hear, design a system, take a breath. Start with questions. Define the '
        'requirements. Estimate the scale. Build the high-level flow. Then go deep where it '
        'matters. Discuss failure, security, and tradeoffs. Finish with a summary. If you follow '
        'that rhythm consistently, you will be much more confident, and your interviewer will be '
        'able to see the quality of your thinking.',
    ),
    (
        'Radha (Teacher)',
        'aura-2-pandora-en',
        'Thank you everyone. Hmmm. I hope this gives you a practical approach that you can use in '
        'your next system design interview. The goal is not to sound like a distributed systems '
        'textbook. The goal is to sound like an engineer who can turn a real product problem into '
        'a clear and dependable design.',
    ),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output", "-o", type=Path, default=Path("system_design_lecture.mp3"), help="Final stitched output audio file."
    )
    parser.add_argument(
        "--pause-ms", type=int, default=500, help="Silence inserted between lines, in milliseconds (default: 500)."
    )
    parser.add_argument(
        "--lines",
        type=str,
        default=None,
        help=(
            "Optional comma-separated list of 0-based DIALOGUE indices to render, in the given "
            "order (e.g. '0,1,14,15'). Useful for generating a short excerpt instead of the full "
            "transcript. Defaults to the entire DIALOGUE list."
        ),
    )
    return parser.parse_args()


def make_silence(duration_ms: int, path: Path) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"anullsrc=r=24000:cl=mono",
            "-t",
            str(duration_ms / 1000),
            "-q:a",
            "9",
            str(path),
        ],
        check=True,
        capture_output=True,
    )


def concat_clips(clip_paths: list[Path], output_path: Path) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as list_file:
        for clip in clip_paths:
            list_file.write(f"file '{clip.resolve()}'\n")
        list_path = Path(list_file.name)

    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_path), "-c:a", "libmp3lame", "-q:a", "2", str(output_path)],
        check=True,
        capture_output=True,
    )
    list_path.unlink(missing_ok=True)


def main() -> None:
    args = parse_args()
    api_key = resolve_api_key(argparse.Namespace(api_key=None))

    if args.lines:
        indices = [int(i.strip()) for i in args.lines.split(",") if i.strip()]
        selected = [(idx, DIALOGUE[idx]) for idx in indices]
    else:
        selected = list(enumerate(DIALOGUE))

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        silence_path = tmp / "silence.mp3"
        make_silence(args.pause_ms, silence_path)

        clip_paths: list[Path] = []
        for pos, (idx, (speaker, model, line)) in enumerate(selected):
            clip_path = tmp / f"line_{pos:03d}.mp3"
            print(f"Synthesizing line {pos + 1}/{len(selected)} (DIALOGUE[{idx}], {speaker}, {model})...")
            synthesize(line, api_key, model, clip_path)
            clip_paths.append(clip_path)
            if pos < len(selected) - 1:
                clip_paths.append(silence_path)

        print("Stitching clips together...")
        concat_clips(clip_paths, args.output)

    print(f"Done. Final dialogue audio written to {args.output}")


if __name__ == "__main__":
    main()
