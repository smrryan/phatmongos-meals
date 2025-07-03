import React, { useState, useEffect } from 'react';
import { ChefHat, Plus, Calendar, ShoppingCart, History, Heart, Star, X, Check } from 'lucide-react';

const PhatMongosMeals = () => {
  const [currentView, setCurrentView] = useState('cookbook');
  const [recipes, setRecipes] = useState([]);
  const [currentMealPlan, setCurrentMealPlan] = useState(null);
  const [shoppingList, setShoppingList] = useState([]);
  const [savedPlans, setSavedPlans] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showFirstTime, setShowFirstTime] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [draggedRecipe, setDraggedRecipe] = useState(null);

  // Show onboarding if no recipes
  useEffect(() => {
    if (recipes.length === 0 && currentView === 'cookbook') {
      setShowFirstTime(true);
    } else {
      setShowFirstTime(false);
    }
  }, [recipes, currentView]);

  const handleLogin = (e) => {
    e.preventDefault();
    console.log('Form submitted with:', loginForm);
    setLoginError('');
    
    const username = loginForm.username.trim();
    const password = loginForm.password.trim();
    
    console.log('Checking:', { username, password });
    console.log('Expected:', { username: 'Ryans', password: 'Ryanseat' });
    
    if (username === 'Ryans' && password === 'Ryanseat') {
      console.log('Setting isLoggedIn to true');
      setIsLoggedIn(true);
    } else {
      console.log('Login failed - setting error');
      setLoginError('Invalid username or password');
    }
  };

  const handleDragStart = (recipe) => {
    setDraggedRecipe(recipe);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, day) => {
    e.preventDefault();
    if (!draggedRecipe || !currentMealPlan) return;
    
    // Only allow dropping on cook days (Mon, Wed, Fri)
    if (!['monday', 'wednesday', 'friday'].includes(day)) return;
    
    const updatedPlan = { ...currentMealPlan };
    updatedPlan[day] = { type: 'recipe', recipe: draggedRecipe };
    
    setCurrentMealPlan(updatedPlan);
    setDraggedRecipe(null);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginForm({ username: '', password: '' });
  };

  // Helper function to clean JSON responses from Claude
  const cleanJsonResponse = (response) => {
    // Remove markdown code blocks and trim whitespace
    return response.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
  };

  const parseRecipe = async (recipeText) => {
    const prompt = `You are an expert recipe parser. Take the following recipe text and convert it to a structured JSON object.

Recipe text:
${recipeText}

Return ONLY valid JSON in this exact format:
{
  "mealTitle": "string",
  "servings": number,
  "ingredients": [
    {"name": "string", "quantity": "string", "unit": "string"}
  ],
  "instructions": ["step 1", "step 2", ...],
  "flavorProfile": ["tag1", "tag2", ...],
  "mealType": "batch-friendly" or "standard",
  "primaryProtein": "string or null"
}

For flavorProfile, analyze the recipe and include VERY DETAILED tags from these categories:
- Cuisine: Mexican, Italian, Asian, American, French, Indian, Mediterranean, Thai, Chinese, Japanese, etc.
- Protein: Beef, Chicken, Pork, Fish, Salmon, Shrimp, Turkey, Lamb, Tofu, Beans, etc.
- Meal Type: Breakfast, Lunch, Dinner, Snack, Appetizer, Side, Dessert, Smoothie, Salad, Soup, etc.
- Cooking Method: Grilled, Baked, Fried, Steamed, Roasted, Slow-cooked, Raw, Sautéed, etc.
- Dietary: Vegetarian, Vegan, Gluten-free, Dairy-free, Low-carb, Keto, Paleo, etc.
- Flavor: Spicy, Sweet, Savory, Salty, Sour, Umami, Smoky, Fresh, Rich, Light, etc.
- Ingredients: Pasta, Rice, Potatoes, Cheese, Tomatoes, Garlic, Onion, Herbs, etc.
- Occasion: Weeknight, Weekend, Holiday, Party, Comfort-food, Quick, Batch-friendly, etc.

Include 8-15 detailed tags per recipe.
For mealType: "batch-friendly" if it makes 6+ servings or is good for leftovers, otherwise "standard"
For primaryProtein: the main protein (beef, chicken, pork, fish, etc.) or null if vegetarian

DO NOT include any text outside the JSON.`;

    try {
      const response = await window.claude.complete(prompt);
      console.log('Raw Claude response:', response);
      
      const cleanedResponse = cleanJsonResponse(response);
      console.log('Cleaned response:', cleanedResponse);
      
      const parsed = JSON.parse(cleanedResponse);
      console.log('Successfully parsed recipe:', parsed);
      
      return parsed;
    } catch (error) {
      console.error('Recipe parsing failed:', error);
      console.error('Failed response:', response);
      alert(`Failed to parse recipe: ${error.message}`);
      return null;
    }
  };

  const generateMealPlan = async () => {
    if (recipes.length < 3) {
      alert('You need at least 3 recipes to generate a meal plan!');
      return;
    }

    setIsGenerating(true);

    const prompt = `You are the Meal Plan Architect for PhatMongos Meals. Generate a weekly meal plan following the "3-Cook-Night" blueprint.

RULES (NON-NEGOTIABLE):
1. Monday: MUST be "batch-friendly" meal (makes leftovers for Tuesday)
2. Tuesday: MUST be "Leftovers" from Monday
3. Wednesday: MUST be "standard" meal (makes leftovers for Thursday) 
4. Thursday: MUST be "Leftovers" from Wednesday
5. Friday: MUST be "standard" meal
6. Saturday & Sunday: MUST be "Flexible" (user choice)

Available recipes:
${JSON.stringify(recipes)}

PROCESS:
1. Shuffle recipes randomly for variety
2. Find first valid batch-friendly recipe for Monday
3. Find first valid standard recipe for Wednesday  
4. Find second valid standard recipe for Friday
5. Check protein variety if possible

Return ONLY valid JSON:
{
  "mealPlan": {
    "monday": {"type": "recipe", "recipe": recipeObject},
    "tuesday": {"type": "leftovers", "from": "monday"},
    "wednesday": {"type": "recipe", "recipe": recipeObject},
    "thursday": {"type": "leftovers", "from": "wednesday"},
    "friday": {"type": "recipe", "recipe": recipeObject},
    "saturday": {"type": "flexible"},
    "sunday": {"type": "flexible"}
  },
  "plannersNote": "Brief note about the plan (1 sentence)",
  "shoppingList": [
    {"category": "Produce", "items": ["item 1", "item 2"]},
    {"category": "Meat & Deli", "items": ["item 1"]},
    {"category": "Pantry", "items": ["item 1", "item 2"]}
  ]
}

DO NOT include any text outside the JSON.`;

    try {
      const response = await window.claude.complete(prompt);
      console.log('Raw meal plan response:', response);
      
      const cleanedResponse = cleanJsonResponse(response);
      console.log('Cleaned meal plan response:', cleanedResponse);
      
      const planData = JSON.parse(cleanedResponse);
      console.log('Successfully parsed meal plan:', planData);
      
      setCurrentMealPlan(planData.mealPlan);
      
      // Flatten shopping list with completion status
      const flatList = [];
      planData.shoppingList.forEach(category => {
        category.items.forEach(item => {
          flatList.push({
            item,
            category: category.category,
            completed: false,
            id: Math.random().toString(36)
          });
        });
      });
      setShoppingList(flatList);
      
    } catch (error) {
      console.error('Meal plan generation failed:', error);
      alert(`Failed to generate meal plan: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const importRecipe = async () => {
    if (!importText.trim()) return;
    
    setIsImporting(true);
    
    const parsedRecipe = await parseRecipe(importText);
    if (parsedRecipe) {
      const newRecipe = {
        ...parsedRecipe,
        id: Math.random().toString(36),
        dateAdded: new Date().toISOString(),
        imageUrl: imageUrl.trim() || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400`
      };
      setRecipes(prev => [...prev, newRecipe]);
      setImportText('');
      setImageUrl('');
      setShowImportModal(false);
    }
    
    setIsImporting(false);
  };

  const savePlan = (rating) => {
    if (!currentMealPlan) return;
    
    const savedPlan = {
      id: Math.random().toString(36),
      mealPlan: currentMealPlan,
      rating,
      dateSaved: new Date().toISOString(),
      week: `Week of ${new Date().toLocaleDateString()}`
    };
    setSavedPlans(prev => [...prev, savedPlan]);
  };

  const toggleShoppingItem = (id) => {
    setShoppingList(prev => 
      prev.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const renderLogin = () => (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform hover:scale-105 transition-transform duration-300">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-orange-100 rounded-full mb-4 animate-bounce">
            <ChefHat className="h-12 w-12 text-orange-500" />
          </div>
          <h1 className="text-4xl font-black text-gray-800 mb-2 tracking-wider">
            PHAT<span className="text-orange-500 tracking-tighter">MONGOS</span>
          </h1>
          <h2 className="text-sm font-light text-gray-600 tracking-[0.3em] uppercase">
            M E A L S
          </h2>
          <p className="text-gray-500 mt-4 font-light tracking-wide">your personal kitchen assistant</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={loginForm.username}
              onChange={(e) => {
                console.log('Username input:', e.target.value);
                setLoginForm({...loginForm, username: e.target.value});
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => {
                console.log('Password input:', e.target.value);
                setLoginForm({...loginForm, password: e.target.value});
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your password"
              required
            />
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg font-bold text-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Sign In to Kitchen
          </button>
        </form>

        <div className="mt-8 text-center">
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg mb-4">
            <p className="font-medium mb-1">Demo Credentials:</p>
            <p>Username: Ryans</p>
            <p>Password: Ryanseat</p>
          </div>
          
          <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
            <p>Debug: isLoggedIn = {isLoggedIn.toString()}</p>
            <p>Current username: "{loginForm.username}"</p>
            <p>Current password: "{loginForm.password}"</p>
          </div>
          
          <button
            onClick={() => setIsLoggedIn(true)}
            className="mt-2 text-xs bg-blue-500 text-white px-3 py-1 rounded"
          >
            Force Login (Debug)
          </button>
        </div>
      </div>
    </div>
  );

  if (!isLoggedIn) {
    return renderLogin();
  }

  const renderNavigation = () => (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <ChefHat className="h-8 w-8 text-orange-500" />
          <h1 className="text-2xl font-black tracking-wider">
            PHAT<span className="text-orange-500 tracking-tighter">MONGOS</span>
            <span className="text-sm font-light tracking-[0.2em] text-gray-500 ml-2">MEALS</span>
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-gray-600 hover:text-gray-800 text-sm font-medium"
        >
          Logout
        </button>
      </div>
      
      <div className="flex space-x-1">
        {[
          { key: 'cookbook', label: 'Cookbook', icon: ChefHat },
          { key: 'mealplan', label: 'Meal Plan', icon: Calendar },
          { key: 'shopping', label: 'Shopping', icon: ShoppingCart },
          { key: 'history', label: 'History', icon: History }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setCurrentView(key)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              currentView === key 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderCookbook = () => (
    <div className="p-6">
      {showFirstTime && recipes.length === 0 ? (
        <div className="text-center py-12">
          <ChefHat className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-3xl font-black mb-2 tracking-wider">
            WELCOME<span className="text-orange-500 text-4xl font-light"> to your</span>
          </h2>
          <h3 className="text-5xl font-light text-gray-800 tracking-tighter -mt-2 mb-4">kitchen!</h3>
          <p className="text-gray-600 mb-6 font-light tracking-wide leading-relaxed">
            Your cookbook is <span className="font-medium">empty</span>. Let's add your favorite recipes to get started.
          </p>
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-orange-500 text-white px-12 py-6 rounded-lg font-black text-xl tracking-wider hover:bg-orange-600 transition-all duration-300 animate-pulse transform hover:scale-105 shadow-2xl"
          >
            IMPORT YOUR<br/>
            <span className="font-light tracking-tighter text-2xl">first recipe</span>
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">My Recipes</h2>
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Recipe</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map(recipe => (
              <div 
                key={recipe.id} 
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => setSelectedRecipe(recipe)}
                draggable
                onDragStart={() => handleDragStart(recipe)}
              >
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={recipe.imageUrl} 
                    alt={recipe.mealTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    {recipe.mealType}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-black text-lg mb-2 tracking-wide">{recipe.mealTitle}</h3>
                  <p className="text-gray-600 text-sm mb-2 font-light">Serves <span className="font-medium">{recipe.servings}</span></p>
                  <div className="flex flex-wrap gap-1">
                    {recipe.flavorProfile?.slice(0, 4).map((tag, idx) => (
                      <span key={idx} className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                    {recipe.flavorProfile?.length > 4 && (
                      <span className="text-gray-500 text-xs">+{recipe.flavorProfile.length - 4} more</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const renderMealPlan = () => (
    <div className="p-6">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-light tracking-widest mb-4">
          THIS <span className="font-black text-orange-500">WEEK'S</span> PLAN
        </h2>
        
        {!currentMealPlan ? (
          <div className="py-12">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-6">Ready to plan your delicious week?</p>
            <button
              onClick={generateMealPlan}
              disabled={recipes.length < 3 || isGenerating}
              className="bg-red-500 text-white px-20 py-8 rounded-lg font-black text-3xl tracking-wider hover:bg-red-600 transition-all duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed transform hover:scale-105 shadow-2xl"
            >
              {isGenerating ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
                  <span className="text-lg font-light tracking-widest">planning your</span>
                  <span className="text-2xl font-black tracking-tighter">DELICIOUS WEEK</span>
                </div>
              ) : (
                <div className="flex flex-col">
                  <span className="text-lg font-light tracking-[0.3em]">LET'S</span>
                  <span className="text-5xl font-black tracking-tighter -mt-2">EAT!</span>
                </div>
              )}
            </button>
            {recipes.length < 3 && (
              <p className="text-red-500 mt-2 text-sm">Add at least 3 recipes to generate a meal plan</p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
              {Object.entries(currentMealPlan).map(([day, meal]) => (
                <div 
                  key={day} 
                  className={`bg-white border-2 border-dashed rounded-lg p-4 min-h-32 transition-all ${
                    ['monday', 'wednesday', 'friday'].includes(day) 
                      ? 'border-orange-300 hover:border-orange-500' 
                      : 'border-gray-200'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  <h3 className="font-black capitalize mb-2 tracking-wide text-orange-500">{day}</h3>
                  {meal.type === 'recipe' ? (
                    <div>
                      <p className="font-medium text-sm">{meal.recipe.mealTitle}</p>
                      <p className="text-xs text-gray-600 mt-1">Cook fresh</p>
                      {meal.recipe.imageUrl && (
                        <img 
                          src={meal.recipe.imageUrl} 
                          alt={meal.recipe.mealTitle}
                          className="w-full h-16 object-cover rounded mt-2"
                        />
                      )}
                    </div>
                  ) : meal.type === 'leftovers' ? (
                    <div>
                      <p className="font-medium text-blue-600 text-sm">Leftovers</p>
                      <p className="text-xs text-gray-600">From {meal.from}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-green-600 text-sm">Flexible</p>
                      <p className="text-xs text-gray-600">Your choice</p>
                    </div>
                  )}
                  {['monday', 'wednesday', 'friday'].includes(day) && (
                    <p className="text-xs text-orange-400 mt-2">Drop recipe here</p>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setCurrentMealPlan(null)}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Generate New Plan
              </button>
              
              <div className="flex space-x-2">
                {[1, 2, 3].map(rating => (
                  <button
                    key={rating}
                    onClick={() => savePlan(rating)}
                    className="flex items-center space-x-1 bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors"
                  >
                    {Array(rating).fill().map((_, i) => (
                      <Heart key={i} className="h-4 w-4 fill-current" />
                    ))}
                    <span>Save</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderShopping = () => {
    const groupedList = shoppingList.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    return (
      <div className="p-6">
        <h2 className="text-4xl font-light tracking-[0.2em] mb-6">
          SHOPPING <span className="font-black text-orange-500 tracking-tighter">LIST</span>
        </h2>
        
        {shoppingList.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Generate a meal plan to create your shopping list</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedList).map(([category, items]) => (
              <div key={category}>
                <h3 className="font-bold text-lg mb-3 text-orange-600">{category}</h3>
                <div className="space-y-2">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        item.completed 
                          ? 'bg-green-50 border-green-200 text-green-800' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleShoppingItem(item.id)}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}>
                        {item.completed && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className={item.completed ? 'line-through' : ''}>{item.item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Saved Plans</h2>
      
      {savedPlans.length === 0 ? (
        <div className="text-center py-12">
          <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No saved meal plans yet. Rate a plan to save it!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {savedPlans.map(plan => (
            <div key={plan.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold">{plan.week}</h3>
                <div className="flex">
                  {Array(plan.rating).fill().map((_, i) => (
                    <Heart key={i} className="h-4 w-4 fill-current text-pink-500" />
                  ))}
                </div>
              </div>
              <p className="text-gray-600 text-sm">Saved on {new Date(plan.dateSaved).toLocaleDateString()}</p>
              <button
                onClick={() => {
                  setCurrentMealPlan(plan.mealPlan);
                  setCurrentView('mealplan');
                }}
                className="mt-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors"
              >
                Use This Plan
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {renderNavigation()}
      
      {currentView === 'cookbook' && renderCookbook()}
      {currentView === 'mealplan' && renderMealPlan()}
      {currentView === 'shopping' && renderShopping()}
      {currentView === 'history' && renderHistory()}
      
      {/* Import Recipe Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Import Recipe</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste your recipe here... (ingredients, instructions, title, etc.)"
              className="w-full h-48 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipe Image URL (optional)
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/recipe-image.jpg"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank for a default food image</p>
            </div>
            
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={importRecipe}
                disabled={!importText.trim() || isImporting}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Importing...</span>
                  </div>
                ) : (
                  'Import Recipe'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="relative">
              <img 
                src={selectedRecipe.imageUrl} 
                alt={selectedRecipe.mealTitle}
                className="w-full h-64 object-cover"
              />
              <button
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-5xl font-light tracking-wider mb-2">
                  {selectedRecipe.mealTitle.split(' ')[0]}{' '}
                  <span className="font-black text-orange-500">
                    {selectedRecipe.mealTitle.split(' ').slice(1).join(' ')}
                  </span>
                </h2>
                <p className="text-lg font-light tracking-wide text-gray-600">
                  Serves <span className="font-black">{selectedRecipe.servings}</span> • 
                  <span className="font-black text-orange-500 ml-2">{selectedRecipe.mealType}</span>
                </p>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-black tracking-wider mb-4 text-orange-500">FLAVOR PROFILE</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedRecipe.flavorProfile?.map((tag, idx) => (
                    <span key={idx} className="bg-orange-100 text-orange-800 px-3 py-2 rounded-full text-sm font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-3xl font-light tracking-widest mb-4">
                    INGRE<span className="font-black text-orange-500">DIENTS</span>
                  </h3>
                  <ul className="space-y-3">
                    {selectedRecipe.ingredients?.map((ingredient, idx) => (
                      <li key={idx} className="flex text-lg font-light leading-relaxed">
                        <span className="font-black text-orange-500 mr-3 w-16">
                          {ingredient.quantity}
                        </span>
                        <span className="font-medium mr-2">{ingredient.unit}</span>
                        <span className="tracking-wide">{ingredient.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-3xl font-light tracking-widest mb-4">
                    INSTRUC<span className="font-black text-orange-500">TIONS</span>
                  </h3>
                  <ol className="space-y-4">
                    {selectedRecipe.instructions?.map((step, idx) => (
                      <li key={idx} className="flex text-lg font-light leading-relaxed">
                        <span className="font-black text-orange-500 mr-4 text-2xl">
                          {idx + 1}
                        </span>
                        <span className="tracking-wide">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhatMongosMeals;