const { GoogleGenerativeAI } = require('@google/generative-ai');
const Property = require('../models/Property.model');
const RentalRequest = require('../models/RentalRequest.model');
const User = require('../models/User.model');

// Configuration
// genAI is initialized inside the handler to ensure current environment variables


const getSystemContext = async (user) => {
  // Fetch some dynamic stats to make the bot smart
  const stats = {
    totalProperties: await Property.countDocuments({ moderationStatus: 'approved' }),
    availableProperties: await Property.countDocuments({ status: 'available', moderationStatus: 'approved' }),
    cities: await Property.distinct('city', { moderationStatus: 'approved' }),
    types: await Property.distinct('type', { moderationStatus: 'approved' }),
  };

  let userContext = "";
  if (user) {
    const userRequests = await RentalRequest.find({ tenant: user._id }).populate('property');
    const userProperties = await Property.find({ owner: user._id });
    
    userContext = `\nInformations sur l'utilisateur actuel (${user.role}):
    - Nom: ${user.fullName}
    - Rôle: ${user.role}
    ${user.role === 'tenant' ? `- Mes demandes de location: ${userRequests.length}` : `- Mes propriétés listées: ${userProperties.length}`}
    `;
    
    if (userRequests.length > 0) {
      userContext += "\nStatut de mes demandes récentes:\n" + userRequests.map(r => `- ${r.property.title}: ${r.status}`).join('\n');
    }
  }

  return `Tu es l'assistant intelligent d'ImmoSmart, une plateforme immobilière premium en Tunisie.
Ta mission est d'aider les utilisateurs à naviguer dans l'application et à répondre à leurs questions sur les services d'ImmoSmart.

CONTEXTE DE L'APPLICATION:
- Nom: ImmoSmart.
- Services: Location de propriétés, gestion de mobilier, contrats numériques.
- Types de logements: S+0, S+1, S+2, S+3, S+4, Villa.
- Localisations disponibles: ${stats.cities.join(', ')}.
- Statistiques actuelles: ${stats.availableProperties} propriétés disponibles sur un total de ${stats.totalProperties}.

RÈGLES CRITIQUES:
1. RÉPONDS UNIQUEMENT aux questions concernant ImmoSmart, l'immobilier sur la plateforme, ou le fonctionnement de l'application.
2. Si l'utilisateur pose une question hors sujet (ex: cuisine, sport, météo mondiale), réponds poliment que tu es spécialisé uniquement dans l'assistance ImmoSmart.
3. Garde un ton professionnel, accueillant et expert.
4. Réponds en Français par défaut, mais adapte-toi si l'utilisateur change de langue.
5. Ne mentionne pas de données sensibles comme les mots de passe.
${userContext}

GUIDE DES FONCTIONNALITÉS:
- Propriétaires: Peuvent ajouter des biens, gérer les demandes, choisir des packs de meubles.
- Locataires: Peuvent chercher des biens, soumettre des dossiers, suivre leurs demandes, signer des contrats.
- Mobilier: ImmoSmart propose des options de meubles (Non meublé, Semi-meublé, Meublé, Meublé haut standing).
- Sécurité: Chaque compte est vérifié et les annonces sont modérées.`;
};

exports.askChatbot = async (req, res) => {
  try {
    const { message, history } = req.body;
    const user = req.user;
    
    console.log('Chatbot Request received:', { message, historyLength: history?.length, user: user?.email });

    if (!process.env.GEMINI_API_KEY) {
      console.error('Chatbot Error: GEMINI_API_KEY is missing');
      return res.status(500).json({ 
        message: "Le service de chatbot n'est pas configuré. Veuillez ajouter GEMINI_API_KEY dans le fichier .env." 
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const systemPrompt = await getSystemContext(user);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });


    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Compris. Je suis l'assistant ImmoSmart et je ne répondrai qu'aux questions concernant cette plateforme et ses services. Comment puis-je vous aider aujourd'hui ?" }] },
        ...(history || [])
      ],
      generationConfig: {
        maxOutputTokens: 500,
      },
    });

    console.log('Sending message to Gemini...');
    let result;
    try {
      result = await chat.sendMessage(message);
    } catch (sendError) {
      if (sendError.message.includes('404') || sendError.message.includes('not found')) {
        console.log('Primary model failed, attempting fallback to gemini-pro...');
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-pro-latest" });
        const fallbackChat = fallbackModel.startChat({
          history: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "Compris. Je suis prêt." }] },
            ...(history || [])
          ]
        });
        result = await fallbackChat.sendMessage(message);
      } else {
        throw sendError;
      }
    }

    const response = await result.response;
    const text = response.text();
    console.log('Gemini responded successfully');

    res.json({ response: text });

  } catch (error) {
    console.error('Detailed Chatbot Error:', error);
    res.status(500).json({ 
      message: "Désolé, j'ai rencontré une erreur.",
      error: error.message || "Erreur inconnue" 
    });
  }
};


