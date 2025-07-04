# PhatMongos Meals

A modern, AI-powered meal planning application that helps you organize recipes, generate weekly meal plans, and create shopping lists.

## Features

- 📝 **Recipe Management**: Import and store your favorite recipes with AI-powered parsing
- 📅 **Smart Meal Planning**: Generate weekly meal plans using the "3-Cook-Night" blueprint
- 🛒 **Shopping Lists**: Automatically generated shopping lists from your meal plans
- 💾 **Data Persistence**: Optional Supabase integration for cloud storage
- 🤖 **AI Integration**: Powered by Google's Gemini AI for recipe parsing and meal planning

## Quick Start

### 1. Deploy to Netlify

#### Option A: One-Click Deploy
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

#### Option B: Manual Deployment

1. **Fork or Clone this repository**
2. **Connect to Netlify**:
   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub/GitLab account
   - Select this repository
   - Deploy settings will be automatically detected from `netlify.toml`

### 2. Setup API Keys

After deployment, you'll need to configure:

#### Required: Gemini API Key
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. In the app, click the key icon in the top right
3. Enter your API key and save

#### Optional: Supabase Database
For data persistence across devices:

1. Create a free account at [Supabase](https://supabase.com)
2. Create a new project
3. Go to Settings → API in your Supabase dashboard
4. Copy your Project URL and anon public key
5. In the app, click the database icon and enter your credentials

### 3. Database Setup (Optional)

If using Supabase, create these tables:

```sql
-- Recipes table
CREATE TABLE recipes (
  id BIGSERIAL PRIMARY KEY,
  meal_title TEXT NOT NULL,
  servings INTEGER NOT NULL,
  ingredients JSONB NOT NULL,
  instructions JSONB NOT NULL,
  flavor_profile JSONB,
  meal_type TEXT,
  primary_protein TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Meal plans table
CREATE TABLE meal_plans (
  id BIGSERIAL PRIMARY KEY,
  plan_data JSONB NOT NULL,
  rating INTEGER,
  week_of TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security (optional)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (optional)
CREATE POLICY "Allow all operations" ON recipes FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON meal_plans FOR ALL USING (true);
```

## How to Use

### 1. Import Recipes
- Click "ADD RECIPE" in the Cookbook
- Paste any recipe text (from websites, books, etc.)
- Hold the "HOLD TO IMPORT" button to parse with AI
- Add images via URL or file upload

### 2. Generate Meal Plans
- Add at least 3 recipes
- Go to "Meal Plan" tab
- Hold the "LET'S EAT!" button to generate a plan
- Uses the 3-Cook-Night system:
  - Monday: Batch cooking (8 servings)
  - Tuesday: Leftovers from Monday
  - Wednesday: Fresh cooking (4 servings)  
  - Thursday: Leftovers from Wednesday
  - Friday: Fresh cooking (4 servings)
  - Weekend: Flexible

### 3. Shopping Lists
- Generated automatically with meal plans
- Organized by category (Produce, Meat & Deli, Pantry)
- Check off items as you shop
- Visual progress tracking

### 4. Drag & Drop
- Drag recipes from cookbook to meal plan days
- Rearrange meal plan days in reorder mode
- Visual feedback and animations

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Technology Stack

- **Frontend**: React 18, Tailwind CSS
- **Icons**: Lucide React
- **AI**: Google Gemini API
- **Database**: Supabase (optional)
- **Deployment**: Netlify
- **Storage**: LocalStorage + cloud sync

## Environment Variables

No environment variables required! All configuration is done through the UI for security and flexibility.

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

If you encounter issues:

1. Check that you have a valid Gemini API key
2. Ensure your Supabase credentials are correct (if using)
3. Try refreshing the page
4. Check browser console for errors

## Features Roadmap

- [ ] Recipe scaling (adjust serving sizes)
- [ ] Nutritional information
- [ ] Recipe sharing
- [ ] Grocery store integration
- [ ] Mobile app
- [ ] Recipe recommendations
- [ ] Meal prep timers

---

**Enjoy cooking with PhatMongos Meals!** 🍳👨‍🍳