-- ============================================================
-- Helmet.io Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USER PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  tokens_remaining INTEGER NOT NULL DEFAULT 10000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, tokens_remaining)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    10000
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RULES GRAPH
-- ============================================================
CREATE TABLE public.rule_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  jurisdiction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID REFERENCES public.rule_categories(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  legal_reference TEXT,
  detection_criteria TEXT NOT NULL,
  remediation_hint TEXT,
  jurisdiction TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.rule_relationships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  parent_rule_id UUID REFERENCES public.rules(id) ON DELETE CASCADE,
  child_rule_id UUID REFERENCES public.rules(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('parent_of', 'exception_to', 'related_to', 'strengthens')),
  UNIQUE(parent_rule_id, child_rule_id, relationship_type)
);

-- Public read access to rules (all users need this for the lawyer agent)
ALTER TABLE public.rule_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rules are publicly readable" ON public.rule_categories FOR SELECT USING (true);
CREATE POLICY "Rules are publicly readable" ON public.rules FOR SELECT USING (true);
CREATE POLICY "Rule relationships are publicly readable" ON public.rule_relationships FOR SELECT USING (true);

-- ============================================================
-- GENERATIONS
-- ============================================================
CREATE TABLE public.generations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL CHECK (input_type IN ('text', 'text_image', 'video')),
  original_prompt TEXT,
  modified_prompt TEXT,
  image_url TEXT,
  input_video_url TEXT,
  output_video_url TEXT,
  output_video_path TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'checking', 'modifying', 'approved', 'generating', 'completed', 'failed', 'rejected')),
  tokens_spent INTEGER DEFAULT 0,
  lawyer_result JSONB,
  planner_result JSONB,
  audio_explanation_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generations" ON public.generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations" ON public.generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generations" ON public.generations
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS (run these separately in Supabase dashboard
-- or via the CLI. Buckets need to be created manually.)
-- ============================================================
-- Bucket: 'uploads'   (for user-uploaded videos/images)
-- Bucket: 'outputs'   (for generated videos)
-- Bucket: 'audio'     (for ElevenLabs audio explanations)

-- ============================================================
-- SEED: RULE CATEGORIES
-- ============================================================
INSERT INTO public.rule_categories (code, name, description, jurisdiction) VALUES
('EU_AI_ACT', 'EU AI Act 2024', 'Regulation (EU) 2024/1689 on Artificial Intelligence', 'European Union'),
('EU_COPYRIGHT', 'EU Copyright Law', 'Directive 2019/790 on Copyright in the Digital Single Market', 'European Union'),
('GDPR', 'GDPR', 'Regulation (EU) 2016/679 - General Data Protection Regulation', 'European Union'),
('CONTENT_SAFETY', 'Content Safety Standards', 'Platform-level and international content safety rules', 'International'),
('DEFAMATION', 'Defamation & Privacy', 'Laws against defamation, libel, slander, and privacy violations', 'International'),
('INTL_STANDARDS', 'International Standards', 'International broadcasting and content distribution standards', 'International');

-- ============================================================
-- SEED: RULES
-- ============================================================
INSERT INTO public.rules (category_id, code, title, description, severity, legal_reference, detection_criteria, remediation_hint, jurisdiction) VALUES

-- EU AI ACT
((SELECT id FROM public.rule_categories WHERE code = 'EU_AI_ACT'),
'EUAIA_001', 'Prohibition on Subliminal Manipulation',
'AI systems must not deploy subliminal techniques beyond a person''s consciousness to materially distort behaviour in a manner that causes harm.',
'CRITICAL', 'EU AI Act Art. 5(1)(a)',
'Content that uses hidden messages, subliminal audio/visual cues, or psychological manipulation techniques to influence viewer behavior without their awareness.',
'Remove or make explicit any persuasion techniques; ensure all influence attempts are transparent and above the threshold of conscious awareness.',
'European Union'),

((SELECT id FROM public.rule_categories WHERE code = 'EU_AI_ACT'),
'EUAIA_002', 'Exploitation of Vulnerabilities Prohibition',
'AI systems must not exploit vulnerabilities of specific groups (age, disability, social/economic situation) to distort their behaviour in a harmful way.',
'CRITICAL', 'EU AI Act Art. 5(1)(b)',
'Content targeting elderly, children, disabled individuals, or economically vulnerable groups with manipulative or exploitative messaging.',
'Remove targeting of vulnerable demographics; ensure content is appropriate for all audiences or properly age-gated.',
'European Union'),

((SELECT id FROM public.rule_categories WHERE code = 'EU_AI_ACT'),
'EUAIA_003', 'Social Scoring Prohibition',
'AI systems used by public authorities for social scoring of individuals based on social behaviour or predicted characteristics are prohibited.',
'CRITICAL', 'EU AI Act Art. 5(1)(c)',
'Content that ranks, scores, or evaluates individuals based on social behavior, demographics, or predicted characteristics for public authority purposes.',
'Remove any social scoring or ranking elements from the content.',
'European Union'),

((SELECT id FROM public.rule_categories WHERE code = 'EU_AI_ACT'),
'EUAIA_004', 'Real-Time Biometric Identification',
'Real-time remote biometric identification systems in publicly accessible spaces by law enforcement are prohibited (with limited exceptions).',
'HIGH', 'EU AI Act Art. 5(1)(d)',
'Content depicting or promoting real-time facial recognition, biometric scanning, or identification of individuals in public spaces.',
'Remove biometric identification elements or add clear disclosure that this is for authorized security purposes only.',
'European Union'),

((SELECT id FROM public.rule_categories WHERE code = 'EU_AI_ACT'),
'EUAIA_005', 'Deepfake Disclosure Requirement',
'AI-generated or manipulated content depicting real persons must be clearly labeled. Providers must ensure content is marked as artificially generated.',
'HIGH', 'EU AI Act Art. 50(2)',
'Any content depicting real identifiable persons that has been AI-generated or significantly altered without explicit disclosure.',
'Add clear visible watermark or disclosure stating "AI-Generated Content" or "Synthetically Modified". Include disclosure in video metadata.',
'European Union'),

((SELECT id FROM public.rule_categories WHERE code = 'EU_AI_ACT'),
'EUAIA_006', 'Synthetic Media Labeling',
'Audio, image, and video content artificially generated or manipulated must carry machine-readable watermarks detectable as AI-generated.',
'HIGH', 'EU AI Act Art. 50(3)',
'AI-generated video or audio content lacking required C2PA-compliant watermarking or content credentials.',
'Ensure the generated video includes C2PA content credentials or equivalent machine-readable disclosure of AI generation.',
'European Union'),

((SELECT id FROM public.rule_categories WHERE code = 'EU_AI_ACT'),
'EUAIA_007', 'Emotion Recognition Restrictions',
'AI systems that infer emotions of natural persons are restricted in workplace and educational settings.',
'MEDIUM', 'EU AI Act Art. 5(1)(f)',
'Content depicting or promoting emotion recognition/sentiment analysis systems used in employment, education, or law enforcement contexts.',
'Remove workplace/educational emotion recognition elements or add explicit consent disclosure.',
'European Union'),

-- EU COPYRIGHT
((SELECT id FROM public.rule_categories WHERE code = 'EU_COPYRIGHT'),
'EUCOPY_001', 'Copyrighted Music',
'Using copyrighted musical works in video content without a synchronization license is prohibited.',
'HIGH', 'Berne Convention Art. 2; EU DSM Directive Art. 17',
'Reference to specific songs, artists, soundtracks, musical compositions, or lyrics from copyrighted works in the video prompt.',
'Replace with royalty-free or Creative Commons licensed music, or obtain proper sync licensing. Describe original music instead.',
'International'),

((SELECT id FROM public.rule_categories WHERE code = 'EU_COPYRIGHT'),
'EUCOPY_002', 'Trademark Infringement',
'Using registered trademarks, brand names, or logos without authorization in commercial content is prohibited.',
'HIGH', 'EU Trademark Regulation 2017/1001; TRIPS Agreement Art. 16',
'Prominent display of brand logos, trademarked names, product packaging, or brand-distinctive colors/shapes in the video.',
'Replace branded elements with generic equivalents or fictional brands. Avoid distinctive brand identifiers.',
'International'),

((SELECT id FROM public.rule_categories WHERE code = 'EU_COPYRIGHT'),
'EUCOPY_003', 'Copyrighted Character Likenesses',
'Reproducing copyrighted fictional characters from films, TV shows, video games, or literature without license is prohibited.',
'HIGH', 'EU DSM Directive; Berne Convention',
'Reference to specific copyrighted characters (e.g., Disney characters, superhero characters, anime characters owned by studios).',
'Use original fictional characters, or characters in the public domain. Describe original characters instead.',
'International'),

((SELECT id FROM public.rule_categories WHERE code = 'EU_COPYRIGHT'),
'EUCOPY_004', 'Film/TV Scene Reproduction',
'Substantially reproducing scenes, cinematography, or visual styles from copyrighted film/TV works is prohibited.',
'MEDIUM', 'EU DSM Directive Art. 4; Berne Convention',
'Prompt describing specific scenes, shots, or visual sequences clearly derived from specific copyrighted films or TV shows.',
'Draw inspiration from multiple sources or describe an original scene. Avoid replicating specific copyrighted sequences.',
'International'),

-- GDPR
((SELECT id FROM public.rule_categories WHERE code = 'GDPR'),
'GDPR_001', 'Biometric Data Processing Without Consent',
'Processing biometric data for identifying natural persons without explicit consent is prohibited.',
'CRITICAL', 'GDPR Art. 9; EU AI Act Art. 10',
'Content depicting identifiable real individuals, facial features for identification, fingerprints, voice patterns used for identification purposes.',
'Remove identifiable biometric features of real individuals, or obtain and document explicit consent from depicted persons.',
'European Union'),

((SELECT id FROM public.rule_categories WHERE code = 'GDPR'),
'GDPR_002', 'Unauthorized Individual Identification',
'Generating content that identifies or could identify specific private individuals without consent violates privacy rights.',
'HIGH', 'GDPR Art. 4, 6; ECHR Art. 8',
'Prompt containing real people''s names combined with identifiable characteristics, or location data that could identify a private individual.',
'Use fictional identities. Remove identifying information. For public figures, ensure content relates to public role only.',
'European Union'),

((SELECT id FROM public.rule_categories WHERE code = 'GDPR'),
'GDPR_003', 'Children''s Data and Likeness Protection',
'Generating content depicting identifiable minors or using minors'' data requires special protection and parental consent.',
'CRITICAL', 'GDPR Art. 8; EU AI Act Art. 5(1)(b)',
'Content depicting real children or creating realistic likenesses of minors without documented parental consent.',
'Use adult actors/models. Do not create realistic likenesses of real children. Use clearly fictional, animated, or adult representations.',
'European Union'),

-- CONTENT SAFETY
((SELECT id FROM public.rule_categories WHERE code = 'CONTENT_SAFETY'),
'SAFE_001', 'Child Sexual Abuse Material (CSAM)',
'Any content that sexualizes minors or constitutes child sexual abuse material is absolutely prohibited worldwide.',
'CRITICAL', 'UN CRC; Budapest Convention; EU Directive 2011/93/EU',
'Any sexual content involving minors, or content that could constitute grooming, exploitation, or sexualization of persons under 18.',
'This content cannot be modified to comply. Request is permanently rejected.',
'International'),

((SELECT id FROM public.rule_categories WHERE code = 'CONTENT_SAFETY'),
'SAFE_002', 'Non-Consensual Intimate Imagery (NCII)',
'Generating realistic sexual or intimate imagery of real identifiable persons without documented consent is prohibited.',
'CRITICAL', 'EU AI Act Art. 5; Numerous national laws',
'Prompt requesting sexual or intimate content depicting real named individuals or identifiable private persons.',
'Remove identifiable individual references. Content must use clearly fictional or consenting adult performers.',
'International'),

((SELECT id FROM public.rule_categories WHERE code = 'CONTENT_SAFETY'),
'SAFE_003', 'Terrorist and Extremist Content',
'Content that promotes, glorifies, or incites terrorism, violent extremism, or organizations designated as terrorist groups.',
'CRITICAL', 'EU Terrorist Content Regulation 2021/784; UN Security Council Resolutions',
'Content promoting or glorifying terrorist organizations, attacks, extremist ideologies, or recruitment for violent extremist groups.',
'Remove all glorification or promotion of extremist groups or violence. Educational or journalistic framing must be clearly documented.',
'International'),

((SELECT id FROM public.rule_categories WHERE code = 'CONTENT_SAFETY'),
'SAFE_004', 'Incitement to Violence and Hate Speech',
'Content that incites violence against individuals or groups, or constitutes hate speech based on protected characteristics.',
'CRITICAL', 'EU Framework Decision 2008/913/JHA; ICCPR Art. 20',
'Content calling for violence, expressing hatred, or dehumanizing individuals based on race, ethnicity, religion, gender, sexual orientation, disability, or nationality.',
'Remove violent or hateful language. Ensure content treats all groups with equal dignity. Add context if discussing these topics educationally.',
'International'),

((SELECT id FROM public.rule_categories WHERE code = 'CONTENT_SAFETY'),
'SAFE_005', 'Graphic Violence',
'Gratuitous graphic violence, gore, or torture content that lacks artistic, journalistic, or educational justification.',
'HIGH', 'Platform Standards; Broadcasting Codes',
'Content depicting extreme graphic violence, gore, dismemberment, or torture for its own sake without clear narrative or educational purpose.',
'Reduce specificity and graphic nature of violent elements. Frame within clear narrative context. Use implied violence instead of explicit depiction.',
'International'),

((SELECT id FROM public.rule_categories WHERE code = 'CONTENT_SAFETY'),
'SAFE_006', 'Self-Harm and Suicide Promotion',
'Content that promotes, glorifies, or provides instruction for self-harm or suicide methods.',
'HIGH', 'WHO Media Guidelines; Platform Standards',
'Content depicting or describing specific suicide methods, self-harm techniques, or glorifying self-destructive behavior.',
'Follow safe messaging guidelines: focus on recovery and help. Remove method descriptions. Add crisis resource information.',
'International'),

((SELECT id FROM public.rule_categories WHERE code = 'CONTENT_SAFETY'),
'SAFE_007', 'Animal Abuse',
'Content depicting or promoting intentional cruelty, abuse, or torture of animals.',
'HIGH', 'EU Animal Welfare Legislation; Animal Cruelty Laws',
'Content depicting or requesting depiction of animal cruelty, torture, or abuse for entertainment purposes.',
'Remove animal cruelty elements. Focus on animal welfare-positive or neutral portrayal of animals.',
'International'),

-- DEFAMATION
((SELECT id FROM public.rule_categories WHERE code = 'DEFAMATION'),
'DEFAM_001', 'Defamation of Real Persons',
'Creating content containing false statements of fact about real identifiable persons that could damage their reputation.',
'HIGH', 'National defamation laws; ECHR Art. 10',
'Content making specific factual claims about named real persons that could be false and damaging to their reputation.',
'Use clearly fictional characters or clearly label content as satire/parody. Remove false factual claims. Focus on documented public facts only.',
'International'),

((SELECT id FROM public.rule_categories WHERE code = 'DEFAMATION'),
'DEFAM_002', 'Impersonation of Real Persons',
'Creating deceptively realistic content that impersonates real identifiable persons (public figures or private individuals).',
'HIGH', 'EU AI Act Art. 50; Identity fraud laws',
'Realistic depiction or voice cloning of real named individuals without their consent in a context that could deceive viewers.',
'Add clear disclosure that content is AI-generated and does not represent real statements/actions of the named person. Use fictional characters instead.',
'International'),

((SELECT id FROM public.rule_categories WHERE code = 'DEFAMATION'),
'DEFAM_003', 'Privacy Violation - Private Information',
'Revealing private information about real individuals (home addresses, medical information, financial details) without consent.',
'HIGH', 'GDPR Art. 9; ECHR Art. 8; National privacy laws',
'Content that reveals or depicts private personal information of identifiable real individuals.',
'Remove all private personal information. Only reference publicly available information about public figures in their public capacity.',
'International'),

-- INTERNATIONAL STANDARDS
((SELECT id FROM public.rule_categories WHERE code = 'INTL_STANDARDS'),
'INTL_001', 'Political Advertising Disclosure',
'Political advertising content generated with AI must be clearly disclosed as AI-generated and as political advertising.',
'MEDIUM', 'EU AI Act Art. 50; Various national election laws',
'Content that promotes political candidates, parties, policies, or positions in a way that could constitute political advertising.',
'Add clear disclosure: "AI-Generated Political Content" or "Political Advertisement". Include sponsor information.',
'International'),

((SELECT id FROM public.rule_categories WHERE code = 'INTL_STANDARDS'),
'INTL_002', 'Religious and Cultural Sensitivity',
'Content that could constitute blasphemy or deeply offensive depictions of religious figures or sacred symbols.',
'MEDIUM', 'Various national laws; Blasphemy laws in some jurisdictions',
'Content depicting religious figures, sacred symbols, or religious practices in deeply offensive or degrading ways.',
'Approach religious and cultural themes with respect. Avoid degrading or mocking depictions of religious figures or sacred practices.',
'International'),

((SELECT id FROM public.rule_categories WHERE code = 'INTL_STANDARDS'),
'INTL_003', 'Misleading Health or Medical Claims',
'AI-generated content making false or unsubstantiated medical, health, or pharmaceutical claims.',
'HIGH', 'EU Digital Services Act; National advertising standards; WHO guidelines',
'Content making specific medical claims, endorsing unproven treatments, or discouraging evidence-based medical care.',
'Remove unsubstantiated health claims. Add "consult a healthcare professional" disclaimers. Base claims on peer-reviewed evidence only.',
'International'),

((SELECT id FROM public.rule_categories WHERE code = 'INTL_STANDARDS'),
'INTL_004', 'Financial Fraud and Investment Scams',
'Content promoting fraudulent financial schemes, unregulated investment products, or guaranteed returns.',
'HIGH', 'EU MiFID II; Various national financial laws',
'Content promising guaranteed financial returns, promoting unregistered investment schemes, or depicting financial fraud.',
'Remove financial claims that are not factually accurate. Add regulatory disclosures. Remove promotion of unregistered financial products.',
'International');

-- ============================================================
-- SEED: RULE RELATIONSHIPS
-- ============================================================
INSERT INTO public.rule_relationships (parent_rule_id, child_rule_id, relationship_type) VALUES
-- EUAIA_001 (subliminal) strengthens SAFE_004 (hate speech) - both are manipulation-based
((SELECT id FROM rules WHERE code='EUAIA_001'), (SELECT id FROM rules WHERE code='SAFE_004'), 'related_to'),
-- EUAIA_002 (vulnerability exploitation) relates to GDPR_003 (children)
((SELECT id FROM rules WHERE code='EUAIA_002'), (SELECT id FROM rules WHERE code='GDPR_003'), 'strengthens'),
-- EUAIA_005 (deepfake disclosure) is parent of EUAIA_006 (synthetic labeling)
((SELECT id FROM rules WHERE code='EUAIA_005'), (SELECT id FROM rules WHERE code='EUAIA_006'), 'parent_of'),
-- EUAIA_005 (deepfake) relates to DEFAM_002 (impersonation)
((SELECT id FROM rules WHERE code='EUAIA_005'), (SELECT id FROM rules WHERE code='DEFAM_002'), 'related_to'),
-- GDPR_001 (biometric) parent of GDPR_002 (individual identification)
((SELECT id FROM rules WHERE code='GDPR_001'), (SELECT id FROM rules WHERE code='GDPR_002'), 'parent_of'),
-- GDPR_003 (children) strengthens SAFE_001 (CSAM)
((SELECT id FROM rules WHERE code='GDPR_003'), (SELECT id FROM rules WHERE code='SAFE_001'), 'strengthens'),
-- SAFE_003 (terrorism) related to SAFE_004 (hate speech)
((SELECT id FROM rules WHERE code='SAFE_003'), (SELECT id FROM rules WHERE code='SAFE_004'), 'related_to'),
-- DEFAM_001 (defamation) parent of DEFAM_003 (privacy)
((SELECT id FROM rules WHERE code='DEFAM_001'), (SELECT id FROM rules WHERE code='DEFAM_003'), 'related_to'),
-- EUAIA_004 (biometric ID) strengthens GDPR_001
((SELECT id FROM rules WHERE code='EUAIA_004'), (SELECT id FROM rules WHERE code='GDPR_001'), 'strengthens');

-- ============================================================
-- Token deduction function (called by API with service role)
-- ============================================================
CREATE OR REPLACE FUNCTION public.deduct_tokens(user_id UUID, amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
  current_tokens INTEGER;
BEGIN
  SELECT tokens_remaining INTO current_tokens FROM public.profiles WHERE id = user_id;
  IF current_tokens < amount THEN
    RAISE EXCEPTION 'Insufficient tokens';
  END IF;
  UPDATE public.profiles
    SET tokens_remaining = tokens_remaining - amount, updated_at = NOW()
    WHERE id = user_id;
  RETURN tokens_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
