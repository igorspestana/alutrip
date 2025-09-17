/**
 * Travel-related keywords for question classification
 * Used to determine if a question is travel-related or not
 */

/**
 * Travel-related keywords (positive indicators)
 * Keywords that indicate a question is about travel, tourism, destinations, etc.
 */
export const TRAVEL_KEYWORDS = [
  // Destinations and places (English)
  'travel', 'trip', 'vacation', 'holiday', 'journey', 'destination', 'place', 'country', 'city', 'town', 'region',
  'visit', 'explore', 'tour', 'sightseeing', 'attraction', 'landmark', 'monument', 'museum', 'gallery',
  
  // Destinations and places (Portuguese)
  'viagem', 'viagens', 'passeio', 'passeios', 'ferias', 'férias', 'jornada', 'destino', 'destinos', 
  'lugar', 'lugares',
  'país', 'paises', 'países', 'cidade', 'cidades', 'cidadezinha', 'região', 'regiões', 'estado', 
  'estados',
  'visitar', 'explorar', 'turismo', 'turista', 'turistas', 'atração', 'atrações', 'ponto turístico', 
  'pontos turísticos',
  'monumento', 'monumentos', 'museu', 'museus', 'galeria', 'galerias', 'igreja', 'igrejas', 'praça', 'praças',
  'roma', 'tailândia', 'eua', 'estados unidos', 'japão', 'europa', 'paris', 'barcelona', 'londres',
  'brasil', 'rio de janeiro', 'fernando de noronha', 'iguaçu', 'cabo frio',
  
  // Accommodation (English)
  'hotel', 'hostel', 'resort', 'accommodation', 'lodging', 'stay', 'booking', 'reservation', 'airbnb',
  'guesthouse', 'bed and breakfast', 'bnb', 'camping', 'campsite',
  
  // Accommodation (Portuguese)
  'hotel', 'hoteis', 'hotéis', 'pousada', 'pousadas', 'resort', 'resorts', 'hospedagem', 'hospedagens',
  'ficar', 'ficando', 'reserva', 'reservas', 'reservar', 'acampamento', 'acampamentos', 'camping',
  'albergue', 'albergues', 'casa de hóspedes', 'pensão', 'pensões',
  
  // Transportation (English)
  'flight', 'airline', 'airport', 'plane', 'train', 'bus', 'car', 'rental', 'taxi', 'uber', 'lyft',
  'transportation', 'transport', 'commute', 'drive', 'road trip', 'cruise', 'ship', 'ferry',
  
  // Transportation (Portuguese)
  'voo', 'voos', 'avião', 'aviões', 'companhia aérea', 'companhias aéreas', 'aeroporto', 'aeroportos',
  'trem', 'trens', 'ônibus', 'onibus', 'carro', 'carros', 'aluguel', 'alugar', 'táxi', 'taxi',
  'transporte', 'transportes', 'dirigir', 'dirigindo', 'viagem de carro', 'cruzeiro', 'cruzeiros',
  'navio', 'navios', 'balsa', 'balsas', 'metrô', 'metro', 'subway',
  
  // Activities and experiences (English)
  'activity', 'activities', 'experience', 'adventure', 'hiking', 'trekking', 'climbing', 'diving',
  'snorkeling', 'surfing', 'skiing', 'snowboarding', 'beach', 'mountain', 'nature', 'park',
  'zoo', 'aquarium', 'theme park', 'amusement park', 'festival', 'event', 'concert', 'show',
  
  // Activities and experiences (Portuguese)
  'atividade', 'atividades', 'experiência', 'experiências', 'aventura', 'aventuras', 'caminhada', 'caminhadas',
  'trilha', 'trilhas', 'escalada', 'escaladas', 'mergulho', 'mergulhos', 'surfe', 'surf', 'praia', 'praias',
  'montanha', 'montanhas', 'natureza', 'parque', 'parques', 'zoológico', 'zoo', 'aquário', 'aquários',
  'parque de diversões', 'parques de diversões', 'festival', 'festivais', 'evento', 'eventos',
  'show', 'shows', 'concerto', 'concertos', 'espetáculo', 'espetáculos',
  
  // Food and dining (English)
  'restaurant', 'food', 'cuisine', 'dining', 'meal', 'eat', 'drink', 'bar', 'cafe', 'coffee',
  'local food', 'traditional food', 'street food', 'market', 'grocery', 'supermarket',
  
  // Food and dining (Portuguese)
  'restaurante', 'restaurantes', 'comida', 'comidas', 'culinária', 'gastronomia', 'refeição', 'refeições',
  'comer', 'bebida', 'bebidas', 'beber', 'bar', 'bares', 'café', 'cafés', 'lanchonete', 'lanchonetes',
  'comida local', 'comida tradicional', 'comida de rua', 'mercado', 'mercados', 'supermercado', 'supermercados',
  'feira', 'feiras', 'padaria', 'padarias', 'confeitaria', 'confeitarias',
  
  // Travel planning (English)
  'plan', 'planning', 'itinerary', 'schedule', 'budget', 'cost', 'price', 'expensive', 'cheap',
  'money', 'currency', 'exchange', 'passport', 'visa', 'document', 'insurance', 'vaccination',
  'weather', 'climate', 'season', 'time', 'when', 'best time', 'worst time',
  
  // Travel planning (Portuguese)
  'plano', 'planos', 'planejar', 'planejamento', 'itinerário', 'itinerários', 'cronograma', 'cronogramas',
  'orçamento', 'orçamentos', 'custo', 'custos', 'preço', 'preços', 'caro', 'cara', 'barato', 'barata',
  'dinheiro', 'moeda', 'moedas', 'câmbio', 'passaporte', 'passaportes', 'visto', 'vistos',
  'documento', 'documentos', 'seguro', 'seguros', 'vacina', 'vacinas', 'vacinação',
  'clima', 'tempo', 'estação', 'estações', 'época', 'épocas', 'quando', 'melhor época', 'pior época',
  'econômica', 'econômico', 'econômicos', 'econômicas', 'barata', 'baratas', 'baratos',
  'preciso', 'precisa', 'precisam', 'necessário', 'necessária', 'necessários', 'necessárias',
  
  // Travel types (English)
  'solo travel', 'family travel', 'business travel', 'luxury travel', 'budget travel',
  'backpacking', 'ecotourism', 'cultural travel', 'adventure travel', 'romantic travel',
  
  // Travel types (Portuguese)
  'viagem solo', 'viagem em família', 'viagem de negócios', 'viagem de luxo', 'viagem econômica',
  'mochilão', 'mochilões', 'ecoturismo', 'viagem cultural', 'viagem de aventura', 'viagem romântica',
  'viagem a dois', 'viagem em casal', 'viagem com crianças', 'viagem com amigos',
  'viagem de estudo', 'viagem de trabalho', 'negócios', 'trabalho',
  
  // Travel concerns (English)
  'safe', 'safety', 'security', 'dangerous', 'risk', 'scam', 'tourist trap', 'crowded',
  'language', 'communication', 'local', 'culture', 'custom', 'tradition', 'etiquette',
  
  // Travel concerns (Portuguese)
  'seguro', 'segura', 'segurança', 'perigoso', 'perigosa', 'risco', 'riscos', 'golpe', 'golpes',
  'armadilha para turistas', 'lotado', 'lotada', 'idioma', 'idiomas', 'língua', 'línguas',
  'comunicação', 'local', 'locais', 'cultura', 'culturas', 'costume', 'costumes', 'tradição', 'tradições',
  'etiqueta', 'comportamento', 'comportamentos',
  
  // Packing and preparation (English)
  'pack', 'packing', 'luggage', 'baggage', 'suitcase', 'backpack', 'clothes', 'clothing',
  'what to wear', 'dress code', 'essentials', 'tips', 'advice', 'recommendation',
  
  // Packing and preparation (Portuguese)
  'fazer mala', 'fazendo mala', 'bagagem', 'bagagens', 'mala', 'malas', 'mochila', 'mochilas',
  'roupas', 'roupa', 'o que vestir', 'código de vestimenta', 'essenciais', 'dicas', 'conselhos',
  'recomendação', 'recomendações', 'sugestão', 'sugestões'
];

/**
 * Non-travel keywords (negative indicators)
 * Keywords that indicate a question is NOT about travel
 */
export const NON_TRAVEL_KEYWORDS = [
  // Technology (English)
  'programming', 'code', 'software', 'app', 'website', 'computer', 'laptop', 'phone', 'technology',
  'ai', 'artificial intelligence', 'machine learning', 'data', 'database', 'server', 'cloud',
  
  // Technology (Portuguese)
  'programação', 'programar', 'código', 'códigos', 'software', 'aplicativo', 'aplicativos', 'app', 'apps',
  'site', 'sites', 'computador', 'computadores', 'laptop', 'laptops', 'telefone', 'telefones', 
  'celular', 'celulares',
  'tecnologia', 'tecnologias', 'ia', 'inteligência artificial', 'aprendizado de máquina', 'dados', 'banco de dados',
  'servidor', 'servidores', 'nuvem', 'cloud', 'desenvolvimento', 'desenvolver', 'programador', 'programadores',
  
  // Health and medicine (English)
  'health', 'medical', 'doctor', 'medicine', 'drug', 'treatment', 'therapy', 'surgery',
  'disease', 'illness', 'symptom', 'diagnosis', 'prescription', 'pharmacy', 'hospital',
  
  // Health and medicine (Portuguese)
  'saúde', 'médico', 'médica', 'médicos', 'medicina', 'medicamento', 'medicamentos', 'remédio', 'remédios',
  'tratamento', 'tratamentos', 'terapia', 'terapias', 'cirurgia', 'cirurgias', 'doença', 'doenças',
  'sintoma', 'sintomas', 'diagnóstico', 'diagnósticos', 'receita', 'receitas', 'farmácia', 'farmácias',
  'hospital', 'hospitais', 'clínica', 'clínicas', 'psicólogo', 'psicóloga', 'psicólogos',
  
  // Legal (English)
  'legal', 'law', 'lawyer', 'attorney', 'court', 'lawsuit', 'contract', 'agreement',
  'rights', 'legal advice', 'jurisdiction', 'regulation', 'compliance',
  
  // Legal (Portuguese)
  'legal', 'lei', 'leis', 'advogado', 'advogada', 'advogados', 'tribunal', 'tribunais', 'justiça',
  'processo', 'processos', 'contrato', 'contratos', 'acordo', 'acordos', 'direitos', 'jurisdição',
  'regulamentação', 'regulamentações', 'conformidade', 'advocacia',
  
  // Finance and investment (English)
  'investment', 'stock', 'trading', 'finance', 'banking', 'loan', 'credit', 'debt',
  'cryptocurrency', 'bitcoin', 'crypto', 'portfolio', 'retirement', 'insurance',
  
  // Finance and investment (Portuguese)
  'investimento', 'investimentos', 'ação', 'ações', 'bolsa', 'bolsas', 'trading', 'finanças',
  'banco', 'bancos', 'banco', 'empréstimo', 'empréstimos', 'crédito', 'créditos', 'dívida', 'dívidas',
  'criptomoeda', 'criptomoedas', 'bitcoin', 'carteira', 'carteiras', 'aposentadoria', 'seguro', 'seguros',
  
  // Education (English)
  'school', 'university', 'college', 'education', 'study', 'learn', 'course', 'degree',
  'homework', 'assignment', 'exam', 'test', 'grade', 'student', 'teacher', 'professor',
  
  // Education (Portuguese)
  'escola', 'escolas', 'universidade', 'universidades', 'faculdade', 'faculdades', 'educação',
  'estudar', 'estudo', 'estudos', 'aprender', 'curso', 'cursos', 'graduação', 'pós-graduação',
  'trabalho de casa', 'trabalhos de casa', 'tarefa', 'tarefas', 'prova', 'provas', 'exame', 'exames',
  'nota', 'notas', 'aluno', 'aluna', 'alunos', 'professor', 'professora', 'professores',
  
  // Personal relationships (English)
  'relationship', 'dating', 'marriage', 'divorce', 'family', 'parenting', 'children',
  'love', 'romance', 'partner', 'boyfriend', 'girlfriend', 'husband', 'wife',
  
  // Personal relationships (Portuguese)
  'relacionamento', 'relacionamentos', 'namoro', 'casamento', 'casamentos', 'divórcio', 'divórcios',
  'família', 'paternidade', 'maternidade', 'filhos', 'filhas', 'amor', 'romance', 'parceiro', 'parceira',
  'namorado', 'namorada', 'marido', 'esposa', 'cônjuge', 'cônjuges',
  
  // Sports (non-travel related) (English)
  'sports', 'football', 'soccer', 'basketball', 'baseball', 'tennis', 'golf', 'swimming',
  'team', 'player', 'game', 'match', 'tournament', 'championship', 'league',
  
  // Sports (non-travel related) (Portuguese)
  'esporte', 'esportes', 'futebol', 'basquete', 'tênis', 'golfe', 'natação', 'time', 'times',
  'jogador', 'jogadora', 'jogadores', 'jogo', 'jogos', 'partida', 'partidas', 'torneio', 'torneios',
  'campeonato', 'campeonatos', 'liga', 'ligas', 'atleta', 'atletas',
  
  // Entertainment (non-travel related) (English)
  'movie', 'film', 'tv', 'television', 'series', 'show', 'book', 'novel', 'music',
  'song', 'album', 'artist', 'celebrity', 'actor', 'actress', 'director',
  
  // Entertainment (non-travel related) (Portuguese)
  'filme', 'filmes', 'tv', 'televisão', 'série', 'séries', 'livro', 'livros', 'romance', 'romances',
  'música', 'músicas', 'música', 'canção', 'canções', 'álbum', 'álbuns', 'artista', 'artistas',
  'celebridade', 'celebridades', 'ator', 'atriz', 'atores', 'diretor', 'diretora', 'diretores',
  
  // Politics and current events (English)
  'politics', 'political', 'election', 'government', 'president', 'minister', 'policy',
  'news', 'current events', 'war', 'conflict', 'economy', 'inflation', 'unemployment',
  
  // Politics and current events (Portuguese)
  'política', 'políticas', 'político', 'política', 'eleição', 'eleições', 'governo', 'governos',
  'presidente', 'ministro', 'ministra', 'ministros', 'política pública', 'políticas públicas',
  'notícias', 'eventos atuais', 'guerra', 'guerras', 'conflito', 'conflitos', 'economia',
  'inflação', 'desemprego', 'eleitor', 'eleitores', 'voto', 'votos', 'candidato', 'candidata',
  
  // Work and career (English)
  'work', 'job', 'career', 'employment', 'salary', 'wage', 'interview', 'resume', 'cv',
  'company', 'business', 'office', 'meeting', 'project', 'deadline', 'boss', 'manager',
  'colleague', 'employee', 'employer', 'promotion', 'raise', 'bonus', 'benefits',
  
  // Work and career (Portuguese)
  'trabalho', 'trabalhos', 'emprego', 'empregos', 'carreira', 'carreiras', 'salário', 'salários',
  'entrevista', 'entrevistas', 'currículo', 'currículos', 'empresa', 'empresas', 'negócio', 'negócios',
  'escritório', 'escritórios', 'reunião', 'reuniões', 'projeto', 'projetos', 'prazo', 'prazos',
  'chefe', 'chefes', 'gerente', 'gerentes', 'colega', 'colegas', 'funcionário', 'funcionários',
  'empregador', 'empregadores', 'promoção', 'promoções', 'aumento', 'aumentos', 'bônus',
  'benefícios', 'beneficio', 'beneficios',
  
  // General non-travel topics (English)
  'help', 'how to', 'what is', 'explain', 'define', 'meaning', 'definition', 'tutorial',
  'guide', 'instructions', 'steps', 'process', 'method', 'way', 'solution', 'problem',
  'issue', 'error', 'bug', 'fix', 'repair', 'maintenance', 'update', 'upgrade',
  
  // General non-travel topics (Portuguese)
  'ajuda', 'como fazer', 'o que é', 'explicar', 'definir', 'significado', 'definição', 'tutorial',
  'guia', 'guias', 'instruções', 'passos', 'processo', 'processos', 'método', 'métodos',
  'maneira', 'maneiras', 'solução', 'soluções', 'problema', 'problemas', 'questão', 'questões',
  'erro', 'erros', 'correção', 'correções', 'conserto', 'consertos', 'manutenção', 'manutenções',
  'atualização', 'atualizações', 'atualizar', 'melhoria', 'melhorias', 'melhorar'
];
