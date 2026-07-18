import { Request, Response } from 'express';
import { isJsonDbActive, readJsonDb } from '../config/db';
import { DestinationModel } from '../models/Destination';

// Helper to get all destinations for AI context
const getAllDestinationsContext = async (): Promise<any[]> => {
  if (isJsonDbActive()) {
    return readJsonDb().destinations;
  } else {
    return await DestinationModel.find({});
  }
};

// Unified Gemini API Caller
const callGemini = async (prompt: string, expectJson = false): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const payload: any = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  };

  if (expectJson) {
    payload.generationConfig = {
      responseMimeType: 'application/json',
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  return data.candidates[0].content.parts[0].text;
};

// Fallback Mock Recommendation Engine
const getMockRecommendations = (pref: any, destinations: any[]) => {
  const { budget, climate, interest, region } = pref;

  // Let's filter destinations dynamically to get realistic mock matches
  let matches = [...destinations];

  if (region && region !== 'All') {
    matches = matches.filter((d) => d.region === region);
  }

  matches = matches.filter((d) => d.cost <= (budget || 5000));

  // Sort by a mock score
  const scoredMatches = matches.map((d) => {
    let score = 75; // base score

    // Climate matches
    if (climate === 'Warm' && d.weatherTemp >= 24) score += 15;
    else if (climate === 'Cool' && d.weatherTemp <= 18) score += 15;
    else if (climate === 'Mild' && d.weatherTemp > 18 && d.weatherTemp < 24) score += 15;

    // Interest matches (mock mapping)
    const desc = (d.shortDescription + ' ' + d.fullDescription).toLowerCase();
    if (interest === 'Beaches' && (desc.includes('beach') || desc.includes('coast') || desc.includes('ocean'))) score += 10;
    if (interest === 'Nightlife' && (desc.includes('nightlife') || desc.includes('club') || desc.includes('bars'))) score += 10;
    if (interest === 'Culture' && (desc.includes('culture') || desc.includes('history') || desc.includes('temple'))) score += 10;
    if (interest === 'Nature' && (desc.includes('nature') || desc.includes('mountains') || desc.includes('forest'))) score += 10;
    if (interest === 'Tech Hub' && (desc.includes('tech') || desc.includes('startup') || desc.includes('digital'))) score += 10;

    return { ...d, matchScore: Math.min(score, 99) };
  });

  scoredMatches.sort((a, b) => b.matchScore - a.matchScore);
  const selected = scoredMatches.slice(0, 3);

  // Generate itinerary and details for selected matches
  return selected.map((d) => ({
    destinationId: d._id || d.id,
    name: d.name,
    country: d.country,
    matchScore: d.matchScore,
    imageUrl: d.imageUrl,
    cost: d.cost,
    internetSpeed: d.internetSpeed,
    reason: `Fits your monthly budget of $${budget} with a cost of $${d.cost}/mo. Offers a ${climate.toLowerCase()} climate (${d.weatherTemp}°C) which aligns with your preference, and has excellent features supporting your interest in ${interest}.`,
    itinerary: [
      {
        day: 'Day 1: Arrival & Connection',
        activities: `Check into your workspace. Get local SIM at airport. Visit a popular local cafe to test the internet (${d.internetSpeed} Mbps). Grab traditional dinner.`,
      },
      {
        day: 'Day 2: Work & Network',
        activities: `Co-work from a local hub. Meet fellow digital nomads. Afternoon walk around the neighborhood. Explore regional coworking communities.`,
      },
      {
        day: 'Day 3: Explore & Adventure',
        activities: `Take a day trip to explore local highlights (beaches, temples, or parks). Wrap up with a dinner at a highly-rated local restaurant.`,
      },
    ],
  }));
};

// Fallback Mock Chat Assistant
const getMockChatResponse = (message: string, history: any[], activeCity: any) => {
  const msg = message.toLowerCase();
  let cityInfo = '';
  
  if (activeCity) {
    cityInfo = `regarding ${activeCity.name}`;
  }

  // Basic mock responses based on keywords
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return {
      text: "Hello! I'm your NomadAI Guide. How can I help you plan your next remote work adventure today?",
      suggestedPrompts: [
        'Which cities are best for a $1,500 budget?',
        'What is the visa situation for digital nomads in Bali?',
        'Show me destinations with >100 Mbps internet.',
      ],
    };
  }

  if (msg.includes('budget') || msg.includes('cheap') || msg.includes('cost')) {
    return {
      text: "If you're on a budget, places like Chiang Mai (Thailand) and Medellin (Colombia) are incredible, offering standard digital nomad lifestyles for under $1,500/month. Bali is also very reasonable (around $1,600/month). Would you like me to recommend affordable destinations in a specific region?",
      suggestedPrompts: [
        'Recommend cities under $1,200/mo',
        'Cost of living breakdown in Bali',
        'Compare cost: Lisbon vs Medellin',
      ],
    };
  }

  if (msg.includes('visa') || msg.includes('passport') || msg.includes('entry')) {
    if (activeCity && activeCity.name.toLowerCase().includes('bali')) {
      return {
        text: "For Bali (Indonesia), most nomads use a Visa on Arrival (VoA) valid for 30 days (extendable once for 30 more days). For longer stays, you can look into the B211A Visit Visa (up to 180 days) or the new Indonesian Remote Worker Visa (E33G) which lets you stay up to 1 year tax-free on foreign income.",
        suggestedPrompts: ['Is there a digital nomad visa in Spain?', 'How to apply for Indonesian E33G visa?', 'Visa requirements for Lisbon'],
      };
    }
    if (activeCity && activeCity.name.toLowerCase().includes('lisbon')) {
      return {
        text: "Portugal offers a dedicated Digital Nomad Visa (D8 Visa) for remote workers earning at least €3,280 per month. It allows you to live and work in Lisbon for up to a year (temporary stay) or apply for residency. You can also travel visa-free throughout the Schengen Area.",
        suggestedPrompts: ['D8 visa application steps', 'Cost of living in Lisbon', 'Coworking in Lisbon'],
      };
    }
    return {
      text: "Many countries now offer Digital Nomad Visas (DNVs), including Portugal (D8), Spain, Croatia, and Indonesia. Requirements usually involve proof of remote employment and a minimum monthly income (ranging from $1,500 to $3,500 USD). Tell me which destination you're interested in, and I can give you detailed visa options!",
      suggestedPrompts: ['Digital Nomad Visa in Portugal', 'Is Bali visa-free?', 'Does Colombia have a nomad visa?'],
    };
  }

  if (msg.includes('internet') || msg.includes('wifi') || msg.includes('speed')) {
    if (activeCity) {
      return {
        text: `In ${activeCity.name}, the average internet speed is around ${activeCity.internetSpeed} Mbps. Most coworking spaces and nomad-friendly cafes have high-speed fiber-optic lines. Cellular coverage (4G/5G) is also excellent—I recommend getting a local eSIM for backup.`,
        suggestedPrompts: [`Best coworking spaces in ${activeCity.name}`, `Sim card options in ${activeCity.country}`, 'Top cities for fast internet'],
      };
    }
    return {
      text: "Internet speeds vary. Tokyo and Lisbon offer blazing fast fiber speeds (>150 Mbps) and excellent 5G cell networks. Bali and Medellin average 50-80 Mbps, which is perfect for video calls but requires picking workspaces carefully. I recommend checking reviews for specific cafes/coworking before arriving.",
      suggestedPrompts: ['Compare internet in Bali vs Lisbon', 'Safest nomad cities', 'Budget destinations']
    };
  }

  // City specific prompts
  if (msg.includes('bali')) {
    return {
      text: "Bali (specifically Canggu and Ubud) is a legendary nomad haven. It offers a tropical lifestyle, cheap villa rentals, incredible cafe culture, and a huge community. The cost is around $1,600/month, and internet speeds average 50 Mbps. Key areas: Canggu for surf/nightlife, Ubud for yoga/jungle vibes.",
      suggestedPrompts: ['Visa for Bali', 'Best cafes in Canggu', 'Weather in Bali'],
    };
  }
  if (msg.includes('lisbon')) {
    return {
      text: "Lisbon is Europe's digital nomad capital. It has a beautiful coast, warm weather, friendly locals, and a booming tech scene. The cost is around $2,800/month (housing has gotten more expensive recently), but internet speeds are fast (120+ Mbps). It is ideal for nomads who want a European base.",
      suggestedPrompts: ['Portugal D8 Visa info', 'Best neighborhoods in Lisbon', 'Compare Lisbon vs Bali'],
    };
  }

  // Default response
  return {
    text: `That's a great question ${cityInfo}! Nomad life offers incredible flexibility. To give you the best advice, could you clarify your preferences regarding monthly budget, internet requirements, or climate? Alternatively, let me know if you want visa or accommodation tips!`,
    suggestedPrompts: [
      'Show me destinations in Europe',
      'What are the safest nomad cities?',
      'Tell me about visa-free travel',
    ],
  };
};

// Endpoints
export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const preferences = req.body;
    const destinations = await getAllDestinationsContext();

    try {
      // Build prompt for live Gemini call
      const prompt = `
        You are NomadAI, an expert travel recommendation engine. 
        Analyze the user's travel preferences:
        Budget: $${preferences.budget} USD/month max
        Climate: ${preferences.climate} (e.g. Warm, Cool, Mild)
        Interest: ${preferences.interest} (e.g. Beaches, Nightlife, Culture, Nature, Tech Hub)
        Region: ${preferences.region} (e.g. Asia, Europe, South America, etc. - "All" means any region)

        Select the top 2-3 matching destinations from this list of cities in our database:
        ${JSON.stringify(destinations.map(d => ({ id: d._id || d.id, name: d.name, country: d.country, cost: d.cost, speed: d.internetSpeed, temp: d.weatherTemp, description: d.shortDescription })))}

        Return a JSON array containing recommendations. Each object in the array MUST have this format:
        {
          "destinationId": "matching destination id",
          "name": "City Name",
          "country": "Country",
          "matchScore": 95, // percentage rating
          "reason": "1-2 sentences explaining why this fits their specific preferences",
          "itinerary": [
            { "day": "Day 1: ...", "activities": "Activities description" },
            { "day": "Day 2: ...", "activities": "Activities description" },
            { "day": "Day 3: ...", "activities": "Activities description" }
          ]
        }
        Do not include markdown tags outside the JSON block. Return ONLY raw JSON.
      `;

      const responseText = await callGemini(prompt, true);
      const jsonRes = JSON.parse(responseText);
      
      // Merge image URLs and cost details from database destinations
      const enriched = jsonRes.map((rec: any) => {
        const original = destinations.find(d => String(d._id || d.id) === String(rec.destinationId) || d.name.toLowerCase() === rec.name.toLowerCase());
        return {
          ...rec,
          imageUrl: original ? original.imageUrl : 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          cost: original ? original.cost : rec.cost,
          internetSpeed: original ? original.internetSpeed : rec.internetSpeed,
        };
      });

      return res.json({ recommendations: enriched, isMock: false });
    } catch (apiError: any) {
      if (apiError.message === 'NO_API_KEY') {
        console.log('Gemini API key missing, generating mock recommendations.');
      } else {
        console.error('Gemini API Error:', apiError.message);
      }
      
      // Fallback to mock recomendations
      const mockRecs = getMockRecommendations(preferences, destinations);
      return res.json({ recommendations: mockRecs, isMock: true });
    }
  } catch (error) {
    console.error('Recommendation Controller Error:', error);
    return res.status(500).json({ message: 'Server error generating recommendations' });
  }
};

export const chatAssistant = async (req: Request, res: Response) => {
  try {
    const { message, history, activeCity } = req.body;

    try {
      const cityContext = activeCity
        ? `The user is currently viewing the city details for: ${activeCity.name}, ${activeCity.country}. Cost of living: $${activeCity.cost}/mo, internet speed: ${activeCity.internetSpeed} Mbps, safety rating: ${activeCity.safetyRating}/5, average temp: ${activeCity.weatherTemp}°C, visa info: ${activeCity.visaRequirement}.`
        : '';

      const prompt = `
        You are NomadAI Guide, an expert digital nomad assistant. You help remote workers find places, understand visa guidelines, estimate cost of living, and plan logistics.
        
        Context:
        ${cityContext}
        
        Recent chat history:
        ${JSON.stringify(history)}
        
        User's message: "${message}"

        Provide a helpful, friendly, and concise response (max 3-4 sentences). 
        You MUST also suggest 3 logical follow-up prompts that the user can click.
        Return your response in raw JSON format (no markdown code blocks, just pure JSON):
        {
          "text": "Your helpful response string.",
          "suggestedPrompts": [
            "Follow-up prompt 1?",
            "Follow-up prompt 2?",
            "Follow-up prompt 3?"
          ]
        }
      `;

      const responseText = await callGemini(prompt, true);
      const jsonRes = JSON.parse(responseText);
      return res.json({ ...jsonRes, isMock: false });
    } catch (apiError: any) {
      // Fallback
      const mockReply = getMockChatResponse(message, history, activeCity);
      return res.json({ ...mockReply, isMock: true });
    }
  } catch (error) {
    console.error('Chat Assistant Controller Error:', error);
    return res.status(500).json({ message: 'Server error in Chat Assistant' });
  }
};
