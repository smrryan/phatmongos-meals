import React, { useState, useEffect } from 'react';
import { ChefHat, Plus, Calendar, ShoppingCart, History, Heart, X, Check, Key, Database } from 'lucide-react';

const PhatMongosMeals = () => {
  // ===================== SUPABASE SETUP =====================
  
  const createSupabaseClient = (url, key) => {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`
    };

    return {
      from: (table) => ({
        select: async (columns = '*') => {
          const response = await fetch(`${url}/rest/v1/${table}?select=${columns}`, {
            headers
          });
          const data = await response.json();
          return { data, error: response.ok ? null : data };
        },
        insert: async (data) => {
          const response = await fetch(`${url}/rest/v1/${table}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
          });
          const result = await response.json();
          return { data: result, error: response.ok ? null : result };
        },
        delete: async () => ({
          eq: async (column, value) => {
            const response = await fetch(`${url}/rest/v1/${table}?${column}=eq.${value}`, {
              method: 'DELETE',
              headers
            });
            return { error: response.ok ? null : await response.json() };
          }
        })
      })
    };
  };

  // ===================== STATE MANAGEMENT =====================
  
  // Core App State
  const [currentView, setCurrentView] = useState('cookbook');
  const [recipes, setRecipes] = useState([]);
  const [currentMealPlan, setCurrentMealPlan] = useState(null);
  const [shoppingList, setShoppingList] = useState([]);
  const [savedPlans, setSavedPlans] = useState([]);
  
  // API State
  const [apiKey, setApiKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  
  // UI State
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [cookingMode, setCookingMode] = useState(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [importText, setImportText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  
  // Animation State
  const [isImporting, setIsImporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [mealPlanProgress, setMealPlanProgress] = useState(0);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [isLongPressingMeal, setIsLongPressingMeal] = useState(false);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [showMealSuccess, setShowMealSuccess] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [showItemBurst, setShowItemBurst] = useState(null);
  
  // Drag & Drop State
  const [draggedRecipe, setDraggedRecipe] = useState(null);
  const [hoveredRecipe, setHoveredRecipe] = useState(null);
  const [dragTrail, setDragTrail] = useState([]);
  const [dropSuccess, setDropSuccess] = useState(null);
  const [draggedDay, setDraggedDay] = useState(null);

  // ===================== SUPABASE FUNCTIONS =====================

  const getSupabase = () => {
    if (!supabaseUrl || !supabaseKey) return null;
    return createSupabaseClient(supabaseUrl, supabaseKey);
  };

  const loadRecipes = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.from('recipes').select();
      if (!error && data) {
        setRecipes(data);
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveRecipe = async (recipe) => {
    const supabase = getSupabase();
    if (!supabase) {
      setRecipes(prev => [...prev, recipe]);
      return recipe;
    }

    try {
      const { data, error } = await supabase.from('recipes').insert([{
        meal_title: recipe.mealTitle,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        flavor_profile: recipe.flavorProfile,
        meal_type: recipe.mealType,
        primary_protein: recipe.primaryProtein,
        image_url: recipe.imageUrl
      }]);
      
      if (!error) {
        await loadRecipes();
      }
      return recipe;
    } catch (error) {
      console.error('Error saving recipe:', error);
      setRecipes(prev => [...prev, recipe]);
      return recipe;
    }
  };

  const loadSavedPlans = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data, error } = await supabase.from('meal_plans').select();
      if (!error && data) {
        const plans = data.map(plan => ({
          id: plan.id,
          mealPlan: plan.plan_data,
          rating: plan.rating,
          dateSaved: plan.created_at,
          week: plan.week_of
        }));
        setSavedPlans(plans);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const saveMealPlan = async (plan) => {
    const supabase = getSupabase();
    if (!supabase) {
      setSavedPlans(prev => [...prev, plan]);
      return;
    }

    try {
      await supabase.from('meal_plans').insert([{
        plan_data: plan.mealPlan,
        rating: plan.rating,
        week_of: plan.week
      }]);
      await loadSavedPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      setSavedPlans(prev => [...prev, plan]);
    }
  };

  // ===================== UTILITY FUNCTIONS =====================

  const clearIntervals = () => {
    if (window.importInterval) clearInterval(window.importInterval);
    if (window.mealInterval) clearInterval(window.mealInterval);
    if (window.dragTrailInterval) clearInterval(window.dragTrailInterval);
  };

  const setupConnection = () => {
    if (supabaseUrl && supabaseKey) {
      localStorage.setItem('supabase-url', supabaseUrl);
      localStorage.setItem('supabase-key', supabaseKey);
      setIsConnected(true);
      setShowConnectionModal(false);
      loadRecipes();
      loadSavedPlans();
    }
  };

  // Load saved connection on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('supabase-url');
    const savedKey = localStorage.getItem('supabase-key');
    const savedApiKey = localStorage.getItem('gemini-api-key');
    
    if (savedUrl && savedKey) {
      setSupabaseUrl(savedUrl);
      setSupabaseKey(savedKey);
      setIsConnected(true);
      loadRecipes();
      loadSavedPlans();
    }
    
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // ===================== GEMINI API FUNCTIONS =====================

  const callGeminiAPI = async (prompt) => {
    if (!apiKey) {
      throw new Error('API key required');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  };

  const cleanJsonResponse = (response) => {
    return response.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
  };

  // ===================== RECIPE MANAGEMENT =====================

  const parseRecipe = async (recipeText) => {
    const prompt = `You are an expert recipe parser. Convert this recipe to structured JSON.

Recipe text:
${recipeText}

Return ONLY valid JSON in this exact format:
{
  "mealTitle": "string",
  "servings": number,
  "ingredients": [{"name": "string", "quantity": "string", "unit": "string"}],
  "instructions": ["step 1", "step 2"],
  "flavorProfile": ["detailed tags covering cuisine, protein, meal type, cooking method, dietary, flavor, ingredients, occasion"],
  "mealType": "batch-friendly" or "standard",
  "primaryProtein": "string or null"
}

Include 8-15 detailed flavor profile tags covering:
- Cuisine: Mexican, Italian, Asian, American, French, etc.
- Protein: Beef, Chicken, Pork, Fish, etc.
- Meal Type: Breakfast, Lunch, Dinner, Snack, etc.
- Method: Grilled, Baked, Fried, Steamed, etc.
- Dietary: Vegetarian, Vegan, Gluten-free, etc.
- Flavor: Spicy, Sweet, Savory, etc.

Use "batch-friendly" for 6+ servings, "standard" otherwise.

DO NOT include any text outside the JSON.`;

    try {
      const response = await callGeminiAPI(prompt);
      const cleanedResponse = cleanJsonResponse(response);
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Recipe parsing failed:', error);
      throw new Error('Failed to parse recipe');
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
        setImageUrl('');
      };
      reader.readAsDataURL(file);
    }
  };

  const importRecipe = async () => {
    if (!importText.trim()) return;
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }
    
    setIsImporting(true);
    
    try {
      const parsedRecipe = await parseRecipe(importText);
      const newRecipe = {
        ...parsedRecipe,
        id: Date.now().toString(),
        dateAdded: new Date().toISOString(),
        imageUrl: uploadedImage || imageUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
      };
      
      await saveRecipe(newRecipe);
      setShowImportSuccess(true);
      
      setTimeout(() => {
        setImportText('');
        setImageUrl('');
        setUploadedImage(null);
        setShowImportModal(false);
        setShowImportSuccess(false);
      }, 2000);
      
    } catch (error) {
      if (error.message.includes('API key')) {
        setShowApiKeyModal(true);
      } else {
        alert('Failed to import recipe. Please try again.');
      }
    } finally {
      setIsImporting(false);
    }
  };

  // ===================== LONG PRESS HANDLERS =====================

  const handleImportLongPress = () => {
    if (!importText.trim() || isImporting) return;
    
    setIsLongPressing(true);
    setImportProgress(0);
    
    const duration = 1500;
    const interval = 16;
    const increment = (interval / duration) * 100;
    
    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setIsLongPressing(false);
          setImportProgress(0);
          importRecipe();
          return 100;
        }
        return newProgress;
      });
    }, interval);
    
    window.importInterval = progressInterval;
  };

  const handleImportRelease = () => {
    clearIntervals();
    setIsLongPressing(false);
    setImportProgress(0);
  };

  const handleMealPlanLongPress = () => {
    if (recipes.length < 3 || isGenerating) return;
    
    setIsLongPressingMeal(true);
    setMealPlanProgress(0);
    
    const duration = 2000;
    const interval = 16;
    const increment = (interval / duration) * 100;
    
    const progressInterval = setInterval(() => {
      setMealPlanProgress(prev => {
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setIsLongPressingMeal(false);
          setMealPlanProgress(0);
          generateMealPlan();
          return 100;
        }
        return newProgress;
      });
    }, interval);
    
    window.mealInterval = progressInterval;
  };

  const handleMealPlanRelease = () => {
    clearIntervals();
    setIsLongPressingMeal(false);
    setMealPlanProgress(0);
  };

  // ===================== MEAL PLAN GENERATION =====================

  const generateMealPlan = async () => {
    if (recipes.length < 3) {
      alert('You need at least 3 recipes to generate a meal plan!');
      return;
    }

    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    setIsGenerating(true);
    
    const prompt = `Generate a weekly meal plan following the "3-Cook-Night" blueprint.

RULES:
1. Monday: "batch-friendly" meal (8 servings, leftovers Tuesday)
2. Wednesday: "standard" meal (4 servings, leftovers Thursday) 
3. Friday: "standard" meal (4 servings)
4. Tuesday/Thursday: leftovers
5. Saturday/Sunday: flexible

Available recipes:
${JSON.stringify(recipes)}

Return ONLY JSON in this exact format:
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
  "shoppingList": [
    {"category": "Produce", "items": ["item1", "item2"]},
    {"category": "Meat & Deli", "items": ["item1"]},
    {"category": "Pantry", "items": ["item1"]}
  ]
}

DO NOT include any text outside the JSON.`;

    try {
      const response = await callGeminiAPI(prompt);
      const cleanedResponse = cleanJsonResponse(response);
      const planData = JSON.parse(cleanedResponse);
      
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 500);
      
      setShowMealSuccess(true);
      setTimeout(() => {
        setCurrentMealPlan(planData.mealPlan);
        
        const flatList = [];
        planData.shoppingList.forEach(category => {
          category.items.forEach(item => {
            flatList.push({
              item,
              category: category.category,
              completed: false,
              id: Date.now().toString() + Math.random()
            });
          });
        });
        setShoppingList(flatList);
        setShowMealSuccess(false);
      }, 2000);
      
    } catch (error) {
      if (error.message.includes('API key')) {
        setShowApiKeyModal(true);
      } else {
        alert('Failed to generate meal plan. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // ===================== DRAG & DROP HANDLERS =====================

  const handleDragStart = (recipe) => {
    setDraggedRecipe(recipe);
    setDragTrail([]);
    
    const trailInterval = setInterval(() => {
      setDragTrail(prev => [
        ...prev.slice(-8),
        {
          id: Math.random(),
          x: Math.random() * 100,
          y: Math.random() * 100
        }
      ]);
    }, 100);
    
    window.dragTrailInterval = trailInterval;
  };

  const handleDragEnd = () => {
    clearIntervals();
    setDragTrail([]);
    setDraggedRecipe(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, day) => {
    e.preventDefault();
    if (!draggedRecipe || !currentMealPlan) return;
    
    if (!['monday', 'wednesday', 'friday'].includes(day)) return;
    
    const updatedPlan = { ...currentMealPlan };
    updatedPlan[day] = { type: 'recipe', recipe: draggedRecipe };
    
    setCurrentMealPlan(updatedPlan);
    setDropSuccess(day);
    setTimeout(() => setDropSuccess(null), 1000);
    
    handleDragEnd();
  };

  const handleDayReorder = (fromDay, toDay) => {
    if (!currentMealPlan || fromDay === toDay) return;
    
    const updatedPlan = { ...currentMealPlan };
    const tempMeal = updatedPlan[fromDay];
    updatedPlan[fromDay] = updatedPlan[toDay];
    updatedPlan[toDay] = tempMeal;
    
    setCurrentMealPlan(updatedPlan);
    setDraggedDay(null);
  };

  // ===================== SHOPPING LIST HANDLERS =====================

  const toggleShoppingItem = (id) => {
    const item = shoppingList.find(item => item.id === id);
    if (!item) return;
    
    setShoppingList(prev => 
      prev.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
    
    if (!item.completed) {
      setShowItemBurst(id);
      setTimeout(() => setShowItemBurst(null), 600);
      
      const categoryItems = shoppingList.filter(i => i.category === item.category);
      const completedCategoryItems = categoryItems.filter(i => i.completed || i.id === id);
      
      if (categoryItems.length === completedCategoryItems.length) {
        setTimeout(() => {
          setScreenShake(true);
          setTimeout(() => setScreenShake(false), 300);
        }, 200);
      }
    }
  };

  // ===================== PLAN MANAGEMENT =====================

  const savePlan = async (rating) => {
    if (!currentMealPlan) return;
    
    const plan = {
      id: Date.now().toString(),
      mealPlan: currentMealPlan,
      rating,
      dateSaved: new Date().toISOString(),
      week: `Week of ${new Date().toLocaleDateString()}`
    };
    
    await saveMealPlan(plan);
  };

  // ===================== MODAL HANDLERS =====================

  const closeAllModals = () => {
    setShowImportModal(false);
    setSelectedRecipe(null);
    setSelectedDay(null);
    setCookingMode(null);
    setShowApiKeyModal(false);
    setShowConnectionModal(false);
    setImportText('');
    setImageUrl('');
    setUploadedImage(null);
  };

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini-api-key', apiKey);
      setShowApiKeyModal(false);
    }
  };

  // ===================== RENDER FUNCTIONS =====================

  const renderNavigation = () => (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <ChefHat className="h-8 w-8 text-orange-500" />
          <h1 className="text-2xl font-black tracking-wider">
            PHAT<span className="text-orange-500 tracking-tighter">MONGOS</span>
            <span className="text-sm font-light tracking-[0.2em] text-gray-500 ml-2">MEALS</span>
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowConnectionModal(true)}
            className={`p-2 rounded-lg transition-colors ${
              isConnected ? 'text-green-600 hover:bg-green-100' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={isConnected ? 'Database Connected' : 'Setup Database'}
          >
            <Database className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => setShowApiKeyModal(true)}
            className={`p-2 rounded-lg transition-colors ${
              apiKey ? 'text-green-600 hover:bg-green-100' : 'text-red-600 hover:bg-red-100'
            }`}
            title={apiKey ? 'API Key Connected' : 'Setup API Key'}
          >
            <Key className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="flex space-x-2">
        {[
          { key: 'cookbook', label: 'Cookbook', icon: ChefHat },
          { key: 'mealplan', label: 'Meal Plan', icon: Calendar },
          { key: 'shopping', label: 'Shopping', icon: ShoppingCart },
          { key: 'history', label: 'History', icon: History }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setCurrentView(key)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 font-medium transition-all duration-200 ${
              currentView === key 
                ? 'bg-orange-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderCookbook = () => (
    <div className="p-8">
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your recipes...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16">
          <ChefHat className="h-20 w-20 text-orange-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black mb-2 tracking-wider">
            WELCOME<span className="text-orange-500 text-4xl font-light"> to your</span>
          </h2>
          <h3 className="text-5xl font-light text-gray-800 tracking-tighter -mt-2 mb-6">kitchen!</h3>
          <p className="text-gray-600 mb-8 font-light tracking-wide leading-relaxed text-lg">
            Your cookbook is <span className="font-medium">empty</span>. Let's add your favorite recipes to get started.
          </p>
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-orange-500 text-white px-12 py-6 rounded-lg font-black text-xl tracking-wider hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 shadow-2xl"
          >
            IMPORT YOUR<br/>
            <span className="font-light tracking-tighter text-2xl">first recipe</span>
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-light tracking-widest">
              MY <span className="font-black text-orange-500 text-4xl tracking-tighter">RECIPES</span>
            </h2>
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition-all duration-300 font-black tracking-wider shadow-lg"
            >
              <Plus className="h-5 w-5" />
              <span>ADD RECIPE</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map(recipe => (
              <div 
                key={recipe.id}
                className={`relative bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer group transition-all duration-500 ${
                  hoveredRecipe === recipe.id ? 'shadow-2xl scale-105 z-10' : 'hover:shadow-lg'
                } ${draggedRecipe?.id === recipe.id ? 'opacity-50 scale-95' : ''}`}
                onClick={() => setSelectedRecipe(recipe)}
                draggable
                onDragStart={() => handleDragStart(recipe)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredRecipe(recipe.id)}
                onMouseLeave={() => setHoveredRecipe(null)}
              >
                {draggedRecipe?.id === recipe.id && (
                  <div className="absolute inset-0 pointer-events-none z-20">
                    {dragTrail.map(particle => (
                      <div
                        key={particle.id}
                        className="absolute w-2 h-2 bg-orange-400 rounded-full animate-ping"
                        style={{
                          left: `${particle.x}%`,
                          top: `${particle.y}%`
                        }}
                      />
                    ))}
                  </div>
                )}
                
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={recipe.imageUrl || recipe.image_url} 
                    alt={recipe.mealTitle || recipe.meal_title}
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      hoveredRecipe === recipe.id ? 'scale-110' : 'group-hover:scale-105'
                    }`}
                  />
                  <div className="absolute top-3 right-3 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    {recipe.mealType || recipe.meal_type}
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-black text-lg mb-2 tracking-wide group-hover:text-orange-600">
                    {recipe.mealTitle || recipe.meal_title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 font-light">
                    Serves <span className="font-medium">{recipe.servings}</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(recipe.flavorProfile || recipe.flavor_profile)?.slice(0, 4).map((tag, idx) => (
                      <span 
                        key={idx} 
                        className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                    {(recipe.flavorProfile || recipe.flavor_profile)?.length > 4 && (
                      <span className="text-gray-500 text-xs">+{(recipe.flavorProfile || recipe.flavor_profile).length - 4} more</span>
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
    <div className={`p-8 transition-all duration-300 ${screenShake ? 'animate-pulse' : ''}`}>
      <div className="text-center mb-10">
        <h2 className="text-4xl font-light tracking-widest mb-8">
          THIS <span className="font-black text-orange-500">WEEK'S</span> PLAN
        </h2>
        
        {!currentMealPlan ? (
          <div className="py-16">
            <Calendar className="h-20 w-20 text-gray-400 mx-auto mb-6" />
            <p className="text-gray-600 mb-8 text-lg font-light">Ready to plan your delicious week?</p>
            <button
              onMouseDown={handleMealPlanLongPress}
              onMouseUp={handleMealPlanRelease}
              onMouseLeave={handleMealPlanRelease}
              onTouchStart={handleMealPlanLongPress}
              onTouchEnd={handleMealPlanRelease}
              disabled={recipes.length < 3 || isGenerating || !apiKey}
              className="relative bg-red-500 text-white px-20 py-8 rounded-lg font-black text-3xl tracking-wider hover:bg-red-600 transition-all duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed transform hover:scale-105 shadow-2xl overflow-hidden"
            >
              {isLongPressingMeal && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-75"
                  style={{ 
                    transform: `scaleX(${mealPlanProgress / 100})`,
                    transformOrigin: 'left center'
                  }}
                />
              )}
              
              {isLongPressingMeal && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-3 h-3 bg-yellow-300 rounded-full animate-spin"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateX(${40 + (mealPlanProgress / 3)}px)`
                      }}
                    />
                  ))}
                </div>
              )}
              
              <span className="relative z-10">
                {isGenerating ? (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
                    <span className="text-lg font-light tracking-widest">planning your</span>
                    <span className="text-2xl font-black tracking-tighter">DELICIOUS WEEK</span>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span className="text-lg font-light tracking-[0.3em]">LET'S</span>
                    <span className="text-5xl font-black tracking-tighter -mt-2">EAT!</span>
                    {!isLongPressingMeal && (
                      <span className="text-xs font-light tracking-wider mt-2 opacity-70">HOLD TO GENERATE</span>
                    )}
                  </div>
                )}
              </span>
            </button>
            {recipes.length < 3 && (
              <p className="text-red-500 mt-4 text-sm">Add at least 3 recipes to generate a meal plan</p>
            )}
            {!apiKey && (
              <p className="text-red-500 mt-2 text-sm">Setup your Gemini API key first</p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-8">
              {Object.entries(currentMealPlan).map(([day, meal]) => (
                <div 
                  key={day}
                  className={`relative bg-white border-2 rounded-lg p-4 min-h-36 cursor-pointer transition-all duration-300 ${
                    reorderMode ? 'hover:scale-105 border-purple-300' : ''
                  } ${
                    ['monday', 'wednesday', 'friday'].includes(day) && draggedRecipe
                      ? 'border-orange-500 bg-orange-50 scale-105 shadow-lg' 
                      : 'border-gray-200'
                  } ${dropSuccess === day ? 'animate-bounce bg-green-50 border-green-500' : ''}`}
                  onClick={() => !reorderMode && setSelectedDay({ day, meal })}
                  draggable={reorderMode}
                  onDragStart={() => reorderMode && setDraggedDay(day)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    if (reorderMode && draggedDay) {
                      handleDayReorder(draggedDay, day);
                    } else {
                      handleDrop(e, day);
                    }
                  }}
                >
                  {draggedRecipe && ['monday', 'wednesday', 'friday'].includes(day) && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 border-2 border-orange-400 rounded-lg animate-pulse" />
                    </div>
                  )}
                  
                  {dropSuccess === day && (
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-1 bg-green-400 animate-ping"
                          style={{
                            height: '40px',
                            left: '50%',
                            top: '50%',
                            transformOrigin: '0 20px',
                            transform: `rotate(${i * 45}deg)`,
                            animationDuration: '600ms'
                          }}
                        />
                      ))}
                    </div>
                  )}
                  
                  <h3 className="font-black capitalize mb-3 tracking-wide text-orange-500 flex items-center justify-between text-sm">
                    {day}
                    {reorderMode && <span className="text-xs text-purple-500">DRAG</span>}
                  </h3>
                  
                  {meal.type === 'recipe' ? (
                    <div>
                      <p className="font-medium text-sm mb-1">{meal.recipe.mealTitle || meal.recipe.meal_title}</p>
                      <p className="text-xs text-gray-600 mb-2">Cook fresh</p>
                      {(meal.recipe.imageUrl || meal.recipe.image_url) && (
                        <img 
                          src={meal.recipe.imageUrl || meal.recipe.image_url} 
                          alt={meal.recipe.mealTitle || meal.recipe.meal_title}
                          className="w-full h-16 object-cover rounded mb-2"
                        />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCookingMode(meal.recipe);
                        }}
                        className="w-full bg-red-500 text-white px-2 py-1 rounded text-xs font-bold hover:bg-red-600 transition-colors"
                      >
                        LET'S COOK!
                      </button>
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
                  
                  {['monday', 'wednesday', 'friday'].includes(day) && !meal.recipe && !reorderMode && (
                    <p className="text-xs mt-2 text-orange-400">
                      {draggedRecipe ? 'Drop here!' : 'Drop recipe here'}
                    </p>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setCurrentMealPlan(null)}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Generate New Plan
              </button>
              
              <button
                onClick={() => setReorderMode(!reorderMode)}
                className={`px-6 py-2 rounded-lg transition-colors font-medium ${
                  reorderMode ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                }`}
              >
                {reorderMode ? 'Exit Reorder' : 'Reorder Mode'}
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

    const completedCount = shoppingList.filter(item => item.completed).length;
    const progressPercent = shoppingList.length > 0 ? (completedCount / shoppingList.length) * 100 : 0;

    return (
      <div className={`p-8 transition-all duration-300 ${screenShake ? 'animate-pulse' : ''}`}>
        <h2 className="text-4xl font-light tracking-[0.2em] mb-8">
          SHOPPING <span className="font-black text-orange-500 tracking-tighter">LIST</span>
        </h2>
        
        {shoppingList.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="h-20 w-20 text-gray-400 mx-auto mb-6" />
            <p className="text-gray-600 text-lg">Generate a meal plan to create your shopping list</p>
          </div>
        ) : (
          <>
            <div className="mb-8 bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            <div className="space-y-8">
              {Object.entries(groupedList).map(([category, items]) => {
                const activeItems = items.filter(item => !item.completed);
                const completedItems = items.filter(item => item.completed);
                
                return (
                  <div key={category}>
                    <h3 className="font-black text-xl mb-4 text-orange-600 tracking-wide">{category}</h3>
                    <div className="space-y-3">
                      {activeItems.map((item) => (
                        <div
                          key={item.id}
                          className="relative flex items-center space-x-4 p-4 rounded-lg border cursor-pointer transition-all duration-300 bg-white border-gray-200 hover:bg-gray-50 hover:shadow-md"
                          onClick={() => toggleShoppingItem(item.id)}
                        >
                          <div className="relative w-6 h-6 rounded-full border-2 flex items-center justify-center border-gray-300 hover:border-orange-500">
                          </div>
                          
                          <span className="flex-1 font-medium text-lg">
                            {item.item}
                          </span>
                          
                          {showItemBurst === item.id && (
                            <div className="absolute inset-0 pointer-events-none">
                              {[...Array(6)].map((_, i) => (
                                <div
                                  key={i}
                                  className="absolute w-2 h-2 bg-green-400 rounded-full animate-ping"
                                  style={{
                                    left: '10%',
                                    top: '50%',
                                    transform: `translate(-50%, -50%) rotate(${i * 60}deg) translateX(20px)`,
                                    animationDuration: '600ms'
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {completedItems.length > 0 && (
                        <div className="border-t border-gray-200 pt-6 mt-6">
                          <h4 className="text-sm font-medium text-gray-500 mb-3 tracking-wider">COMPLETED</h4>
                          {completedItems.map(item => (
                            <div
                              key={item.id}
                              className="relative flex items-center space-x-4 p-4 rounded-lg border cursor-pointer transition-all duration-300 bg-green-50 border-green-200 text-green-800 scale-95 opacity-75 hover:opacity-90 mb-2"
                              onClick={() => toggleShoppingItem(item.id)}
                            >
                              <div className="relative w-6 h-6 rounded-full border-2 flex items-center justify-center bg-green-500 border-green-500">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                              
                              <span className="flex-1 font-medium line-through opacity-70 text-lg">
                                {item.item}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderHistory = () => (
    <div className="p-8">
      <h2 className="text-4xl font-light tracking-[0.2em] mb-8">
        SAVED <span className="font-black text-orange-500 tracking-tighter">PLANS</span>
      </h2>
      
      {savedPlans.length === 0 ? (
        <div className="text-center py-16">
          <History className="h-20 w-20 text-gray-400 mx-auto mb-6" />
          <p className="text-gray-600 text-lg">No saved meal plans yet. Rate a plan to save it!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedPlans.map(plan => (
            <div key={plan.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg">{plan.week}</h3>
                <div className="flex">
                  {Array(plan.rating).fill().map((_, i) => (
                    <Heart key={i} className="h-5 w-5 fill-current text-pink-500" />
                  ))}
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">Saved on {new Date(plan.dateSaved).toLocaleDateString()}</p>
              <button
                onClick={() => {
                  setCurrentMealPlan(plan.mealPlan);
                  setCurrentView('mealplan');
                }}
                className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                USE THIS PLAN
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ===================== MAIN RENDER =====================

  return (
    <div className="min-h-screen bg-gray-50">
      {renderNavigation()}
      
      {currentView === 'cookbook' && renderCookbook()}
      {currentView === 'mealplan' && renderMealPlan()}
      {currentView === 'shopping' && renderShopping()}
      {currentView === 'history' && renderHistory()}
      
      {/* Connection Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Setup Supabase Database</h3>
              <button onClick={closeAllModals} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supabase URL
                </label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anon Public Key
                </label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="Your anon public key"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <p className="text-xs text-gray-500">
                Get these from your Supabase project Settings → API
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={closeAllModals} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={setupConnection}
                disabled={!supabaseUrl.trim() || !supabaseKey.trim()}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-300"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Setup Gemini API Key</h3>
              <button onClick={closeAllModals} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">
                Get your free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button onClick={closeAllModals} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={saveApiKey}
                disabled={!apiKey.trim()}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-300"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Import Recipe Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black tracking-wider">
                IMPORT <span className="text-orange-500">RECIPE</span>
              </h3>
              <button onClick={closeAllModals} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste your recipe here... (ingredients, instructions, title, etc.)"
              className="w-full h-48 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4"
            />
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Recipe Image</label>
              
              <div className="space-y-4">
                <div>
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="image-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Image
                  </label>
                </div>
                
                <div className="flex items-center">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span className="px-3 text-gray-500 text-sm">OR</span>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>
                
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    if (e.target.value) setUploadedImage(null);
                  }}
                  placeholder="https://example.com/recipe-image.jpg"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={!!uploadedImage}
                />
                
                {(uploadedImage || imageUrl) && (
                  <div className="relative">
                    <img 
                      src={uploadedImage || imageUrl} 
                      alt="Recipe preview"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImage(null);
                        setImageUrl('');
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-gray-500 mt-2">Upload an image or paste a URL. Leave blank for a default food image.</p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button onClick={closeAllModals} className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium">
                Cancel
              </button>
              <button
                onMouseDown={handleImportLongPress}
                onMouseUp={handleImportRelease}
                onMouseLeave={handleImportRelease}
                onTouchStart={handleImportLongPress}
                onTouchEnd={handleImportRelease}
                disabled={!importText.trim() || isImporting}
                className="relative bg-orange-500 text-white px-8 py-4 rounded-lg hover:bg-orange-600 transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed font-black tracking-wider overflow-hidden"
              >
                {isLongPressing && (
                  <div 
                    className="absolute inset-0 bg-orange-600 transition-all duration-75"
                    style={{ 
                      transform: `scaleX(${importProgress / 100})`,
                      transformOrigin: 'left center'
                    }}
                  />
                )}
                
                {isLongPressing && (
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-ping"
                        style={{
                          left: `${20 + (i * 10)}%`,
                          top: `${20 + (i % 3) * 20}%`,
                          animationDelay: `${i * 100}ms`,
                          animationDuration: '800ms'
                        }}
                      />
                    ))}
                  </div>
                )}
                
                <span className="relative z-10">
                  {isImporting ? 'Importing...' : 'HOLD TO IMPORT'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
            <div className="relative">
              <img 
                src={selectedRecipe.imageUrl || selectedRecipe.image_url} 
                alt={selectedRecipe.mealTitle || selectedRecipe.meal_title}
                className="w-full h-64 object-cover"
              />
              <button onClick={closeAllModals} className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-5xl font-light tracking-wider mb-2">
                  {(selectedRecipe.mealTitle || selectedRecipe.meal_title).split(' ')[0]}{' '}
                  <span className="font-black text-orange-500">
                    {(selectedRecipe.mealTitle || selectedRecipe.meal_title).split(' ').slice(1).join(' ')}
                  </span>
                </h2>
                <p className="text-lg font-light tracking-wide text-gray-600">
                  Serves <span className="font-black">{selectedRecipe.servings}</span> • 
                  <span className="font-black text-orange-500 ml-2">{selectedRecipe.mealType || selectedRecipe.meal_type}</span>
                </p>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-black tracking-wider mb-4 text-orange-500">FLAVOR PROFILE</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedRecipe.flavorProfile || selectedRecipe.flavor_profile)?.map((tag, idx) => (
                    <span key={idx} className="bg-orange-100 text-orange-800 px-3 py-2 rounded-full text-sm font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-12">
                <div>
                  <h3 className="text-3xl font-light tracking-widest mb-6">
                    INGRE<span className="font-black text-orange-500">DIENTS</span>
                  </h3>
                  <ul className="space-y-4">
                    {(selectedRecipe.ingredients)?.map((ingredient, idx) => (
                      <li key={idx} className="flex text-lg font-light leading-relaxed">
                        <span className="font-black text-orange-500 mr-4 w-20">
                          {ingredient.quantity}
                        </span>
                        <span className="font-medium mr-3">{ingredient.unit}</span>
                        <span className="tracking-wide">{ingredient.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-3xl font-light tracking-widest mb-6">
                    INSTRUC<span className="font-black text-orange-500">TIONS</span>
                  </h3>
                  <ol className="space-y-6">
                    {(selectedRecipe.instructions)?.map((step, idx) => (
                      <li key={idx} className="flex text-lg font-light leading-relaxed">
                        <span className="font-black text-orange-500 mr-6 text-3xl">
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
      
      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-light tracking-wider capitalize">
                  {selectedDay.day} <span className="font-black text-orange-500">MEAL</span>
                </h2>
                <button onClick={closeAllModals} className="text-gray-500 hover:text-gray-700">
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {selectedDay.meal.type === 'recipe' && (
                <div className="space-y-4">
                  <img 
                    src={selectedDay.meal.recipe.imageUrl || selectedDay.meal.recipe.image_url} 
                    alt={selectedDay.meal.recipe.mealTitle || selectedDay.meal.recipe.meal_title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <h3 className="text-2xl font-bold">{selectedDay.meal.recipe.mealTitle || selectedDay.meal.recipe.meal_title}</h3>
                  <button
                    onClick={() => setCookingMode(selectedDay.meal.recipe)}
                    className="bg-red-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-600 transition-colors"
                  >
                    LET'S COOK!
                  </button>
                </div>
              )}
              
              {selectedDay.meal.type === 'leftovers' && (
                <div className="text-center py-8">
                  <h3 className="text-xl font-bold text-blue-600 mb-2">Leftovers Day!</h3>
                  <p className="text-gray-600">Enjoy your meal from {selectedDay.meal.from}</p>
                </div>
              )}
              
              {selectedDay.meal.type === 'flexible' && (
                <div className="text-center py-8">
                  <h3 className="text-xl font-bold text-green-600 mb-2">Flexible Day!</h3>
                  <p className="text-gray-600">Choose whatever you're in the mood for</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Cooking Mode */}
      {cookingMode && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="bg-gray-900 text-white p-6 flex justify-between items-center">
            <h1 className="text-3xl font-black tracking-wider">
              COOKING: <span className="text-orange-400">{cookingMode.mealTitle || cookingMode.meal_title}</span>
            </h1>
            <button
              onClick={() => setCookingMode(null)}
              className="bg-red-500 hover:bg-red-600 px-6 py-3 rounded font-black tracking-wider"
            >
              EXIT KITCHEN
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
            <div className="bg-white rounded-lg p-12 shadow-lg max-w-7xl mx-auto">
              <h2 className="text-6xl font-light tracking-wider mb-8">
                {(cookingMode.mealTitle || cookingMode.meal_title).split(' ')[0]}{' '}
                <span className="font-black text-orange-500">
                  {(cookingMode.mealTitle || cookingMode.meal_title).split(' ').slice(1).join(' ')}
                </span>
              </h2>
              
              <div className="grid md:grid-cols-2 gap-16">
                <div>
                  <h3 className="text-4xl font-light tracking-widest mb-8 text-orange-500">
                    INGREDIENTS
                  </h3>
                  <ul className="space-y-6">
                    {(cookingMode.ingredients)?.map((ingredient, idx) => (
                      <li key={idx} className="text-2xl flex font-light leading-relaxed">
                        <span className="font-black text-orange-500 mr-6 w-24">
                          {ingredient.quantity}
                        </span>
                        <span className="font-medium mr-4">{ingredient.unit}</span>
                        <span className="tracking-wide">{ingredient.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-4xl font-light tracking-widest mb-8 text-orange-500">
                    INSTRUCTIONS
                  </h3>
                  <ol className="space-y-8">
                    {(cookingMode.instructions)?.map((step, idx) => (
                      <li key={idx} className="text-2xl flex font-light leading-relaxed">
                        <span className="font-black text-orange-500 mr-8 text-4xl">
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
      
      {/* Success Animations */}
      {showImportSuccess && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 bg-orange-400 animate-ping"
                  style={{
                    height: '200px',
                    left: '50%',
                    top: '50%',
                    transformOrigin: '0 100px',
                    transform: `rotate(${i * 30}deg)`,
                    animationDuration: '1000ms'
                  }}
                />
              ))}
            </div>
            <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center animate-bounce">
              <ChefHat className="h-12 w-12 text-white" />
            </div>
          </div>
        </div>
      )}
      
      {showMealSuccess && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 bg-gradient-to-r from-red-500 to-orange-500 animate-ping"
                  style={{
                    height: '300px',
                    left: '50%',
                    top: '50%',
                    transformOrigin: '0 150px',
                    transform: `rotate(${i * 22.5}deg)`,
                    animationDuration: '1500ms',
                    animationDelay: `${i * 50}ms`
                  }}
                />
              ))}
            </div>
            <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center animate-bounce z-10 relative">
              <ChefHat className="h-16 w-16 text-white" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhatMongosMeals;