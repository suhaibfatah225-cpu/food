const CONFIG = {
    MEAL_API: 'https://www.themealdb.com/api/json/v1/1',
    DAILY_LIMITS: { calories: 2000, protein: 50, carbs: 250, fat: 65 }
};

const MEAL_CATEGORY_DATA = {
    'Beef': { color: 'red', icon: 'fa-drumstick-bite' },
    'Chicken': { color: 'orange', icon: 'fa-drumstick-bite' },
    'Dessert': { color: 'pink', icon: 'fa-cake-candles' },
    'Lamb': { color: 'amber', icon: 'fa-drumstick-bite' },
    'Miscellaneous': { color: 'gray', icon: 'fa-bowl-rice' },
    'Pasta': { color: 'yellow', icon: 'fa-bowl-food' },
    'Pork': { color: 'rose', icon: 'fa-bacon' },
    'Seafood': { color: 'cyan', icon: 'fa-fish' },
    'Side': { color: 'emerald', icon: 'fa-carrot' },
    'Starter': { color: 'teal', icon: 'fa-utensils' },
    'Vegan': { color: 'green', icon: 'fa-leaf' },
    'Vegetarian': { color: 'lime', icon: 'fa-seedling' },
    'Breakfast': { color: 'blue', icon: 'fa-mug-hot' },
    'Goat': { color: 'stone', icon: 'fa-drumstick-bite' }
};

const PRODUCT_CATEGORY_DATA = [
    { name: 'Breakfast Cereals', color: 'bg-orange-500', icon: 'fa-wheat-awn' },
    { name: 'Beverages', color: 'bg-blue-500', icon: 'fa-bottle-water' },
    { name: 'Snacks', color: 'bg-purple-500', icon: 'fa-cookie' },
    { name: 'Dairy Products', color: 'bg-sky-500', icon: 'fa-cheese' },
    { name: 'Fruits', color: 'bg-red-500', icon: 'fa-apple-whole' },
    { name: 'Vegetables', color: 'bg-emerald-500', icon: 'fa-carrot' },
    { name: 'Breads', color: 'bg-amber-600', icon: 'fa-bread-slice' },
    { name: 'Meats', color: 'bg-red-600', icon: 'fa-drumstick-bite' }
];

function getCatStyle(gray) {
    return MEAL_CATEGORY_DATA[gray] || { color: 'gray', icon: 'fa-utensils' };
}

class FoodLogService {
    constructor() {
        this.storageKey = 'nutriplan_log_v3';
        this.init();
    }

    init() {
        if (!localStorage.getItem(this.storageKey)) this.resetLog();
        const data = this.getLog();
        if (data.date !== new Date().toLocaleDateString()) this.resetLog();
    }

    resetLog() {
        const initialData = { date: new Date().toLocaleDateString(), items: [] };
        localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    }

    getLog() {
        try { return JSON.parse(localStorage.getItem(this.storageKey)); } catch (e) { return { date: new Date().toLocaleDateString(), items: [] }; }
    }

    addItem(item) {
        const log = this.getLog();
        log.items.push({ id: Date.now().toString(), ...item });
        localStorage.setItem(this.storageKey, JSON.stringify(log));
        window.dispatchEvent(new CustomEvent('foodLogUpdated'));
    }

    removeItem(id) {
        const log = this.getLog();
        log.items = log.items.filter(item => item.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(log));
        window.dispatchEvent(new CustomEvent('foodLogUpdated'));
    }

    getTotals() {
        const log = this.getLog();
        return log.items.reduce((acc, item) => {
            acc.calories += item.nutrition.calories || 0;
            acc.protein += item.nutrition.protein || 0;
            acc.carbs += item.nutrition.carbs || 0;
            acc.fat += item.nutrition.fat || 0;
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }
}

class MealService {
    async getMeals(query = '') {
        try {
            const url = query ? `${CONFIG.MEAL_API}/search.php?s=${query}` : `${CONFIG.MEAL_API}/search.php?s=chicken`;
            const res = await fetch(url);
            const data = await res.json();
            return data.meals || [];
        } catch (error) { return []; }
    }

    async getMealById(id) {
        try {
            const res = await fetch(`${CONFIG.MEAL_API}/lookup.php?i=${id}`);
            const data = await res.json();
            return data.meals ? data.meals[0] : null;
        } catch (error) { return null; }
    }

    async getCategories() {
        try {
            const res = await fetch(`${CONFIG.MEAL_API}/categories.php`);
            const data = await res.json();
            return data.categories || [];
        } catch (error) { return []; }
    }

    async filterByArea(area) {
        try {
            const res = await fetch(`${CONFIG.MEAL_API}/filter.php?a=${area}`);
            const data = await res.json();
            return data.meals || [];
        } catch (error) { return []; }
    }

    async filterByCategory(cat) {
        try {
            const res = await fetch(`${CONFIG.MEAL_API}/filter.php?c=${cat}`);
            const data = await res.json();
            return data.meals || [];
        } catch (error) { return []; }
    }
}

class ProductService {
    async searchProduct(name) {
        try {
            const url = `${CONFIG.PRODUCT_API}/cgi/search.pl?search_terms=${name}&search_simple=1&action=process&json=1&page_size=20`;
            const res = await fetch(url);
            const data = await res.json();
            return data.products || [];
        } catch (e) { return []; }
    }

    async getProductByBarcode(barcode) {
        try {
            const url = `${CONFIG.PRODUCT_API}/api/v0/product/${barcode}.json`;
            const res = await fetch(url);
            const data = await res.json();
            return data.status === 1 ? [data.product] : [];
        } catch (error) { return []; }
    }
}

class App {
    constructor() {
        this.mealService = new MealService();
        this.productService = new ProductService();
        this.foodLogService = new FoodLogService();
        this.container = document.getElementById('app-container');
        this.currentSearchProducts = [];
        this.init();
    }

    init() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate(link.dataset.page);
            });
        });

        window.addEventListener('foodLogUpdated', () => this.updateSidebar());

        document.getElementById('mobile-menu-btn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('hidden');
            document.getElementById('sidebar').classList.toggle('absolute');
            document.getElementById('sidebar').classList.toggle('h-full');
            document.getElementById('sidebar').classList.toggle('inset-0');
        });

        this.navigate('home');
    }

    navigate(page, param = null) {
        document.querySelectorAll('.nav-link').forEach(l => {
            if (l.dataset.page === page && !param) l.classList.add('active', 'bg-emerald-50', 'text-primary');
            else l.classList.remove('active', 'bg-emerald-50', 'text-primary');
        });

        if (page === 'home') this.renderHome();
        else if (page === 'meal-detail') this.renderMealDetail(param);
        else if (page === 'scanner') this.renderScanner();
        else if (page === 'foodlog') this.renderFoodLog();
    }

    showNotification(msg) {
        const c = document.getElementById('notification-container');
        const d = document.createElement('div');
        d.className = "bg-dark text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 transform translate-y-10 opacity-0 transition-all duration-300 pointer-events-auto min-w-[250px]";
        d.innerHTML = `<i class="fa-solid fa-circle-check text-primary"></i><span class="text-sm font-medium">${msg}</span>`;
        c.appendChild(d);
        setTimeout(() => d.classList.remove('translate-y-10', 'opacity-0'), 10);
        setTimeout(() => {
            d.classList.add('opacity-0');
            setTimeout(() => d.remove(), 300);
        }, 3000);
    }
    async renderHome() {
            this.container.innerHTML = `
            <div class="px-6 py-8 md:px-10 max-w-[1600px] mx-auto animate-fade-in pb-20">
                <div class="mb-8"><h1 class="text-3xl font-bold text-dark mb-1">Meals & Recipes</h1><p class="text-gray-500 text-sm">Discover delicious and nutritious recipes tailored for you</p></div>
                <div class="mb-8"><div class="relative w-full mb-6"><i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i><input id="meal-search" type="text" placeholder="Search recipes..." class="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-white shadow-sm"></div>
                <div class="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1" id="cuisine-filters"><button class="filter-btn active px-6 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors bg-primary text-white" data-type="all">All Cuisines</button>${['Algerian','American','British','Canadian','Chinese','Egyptian','Italian','Mexican'].map(c=>`<button class="filter-btn px-6 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors bg-white border border-gray-200 text-gray-600 hover:bg-gray-50" data-type="area" data-val="${c}">${c}</button>`).join('')}</div></div>
                <div class="mb-10"><div class="flex justify-between items-end mb-4"><div><h2 class="text-xl font-bold text-dark">Browse by Meal Type</h2></div></div><div id="cat-grid" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"></div></div>
                <div><div class="flex justify-between items-center mb-6"><h2 class="text-xl font-bold text-dark">All Recipes</h2></div><div id="recipe-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"></div></div>
            </div>`;
        
        const catGrid = document.getElementById('cat-grid');
        const categories = await this.mealService.getCategories();
        categories.slice(0, 12).forEach(cat => {
            const style = getCatStyle(cat.strCategory);
            const iconBgMap = { red:'bg-red-500', orange:'bg-orange-500', pink:'bg-pink-500', amber:'bg-amber-500', gray:'bg-gray-500', yellow:'bg-yellow-500', rose:'bg-rose-500', cyan:'bg-cyan-500', emerald:'bg-emerald-500', teal:'bg-teal-500', green:'bg-green-500', lime:'bg-lime-500', blue:'bg-blue-500', stone:'bg-stone-500' };
            const el = document.createElement('div');
            el.className = `bg-white border border-gray-200 p-3 rounded-xl flex items-center gap-3 cursor-pointer category-card hover:shadow-sm`;
            el.innerHTML = `<div class="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm ${iconBgMap[style.color]}"><i class="fa-solid ${style.icon}"></i></div><span class="font-bold text-gray-800 text-sm">${cat.strCategory}</span>`;
            el.onclick = () => this.loadRecipes(this.mealService.filterByCategory(cat.strCategory));
            catGrid.appendChild(el);
        });

        this.loadRecipes(this.mealService.getMeals('Chicken'));
        
        const searchInput = document.getElementById('meal-search');
        let debounce;
        searchInput.addEventListener('input', (e) => { clearTimeout(debounce); debounce = setTimeout(() => this.loadRecipes(this.mealService.getMeals(e.target.value)), 500); });

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.className = 'filter-btn px-6 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors bg-white border border-gray-200 text-gray-600 hover:bg-gray-50');
                btn.className = 'filter-btn active px-6 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors bg-primary text-white';
                if (btn.dataset.type === 'all') this.loadRecipes(this.mealService.getMeals('Chicken'));
                else this.loadRecipes(this.mealService.filterByArea(btn.dataset.val));
            });
        });
    }

    async loadRecipes(promise) {
        const grid = document.getElementById('recipe-grid');
        grid.innerHTML = '<div class="col-span-full py-12 flex justify-center"><div class="loader"></div></div>';
        const meals = await promise;
        grid.innerHTML = '';
        if (!meals || meals.length === 0) { grid.innerHTML = '<div class="col-span-full py-12 text-center text-gray-400">No recipes found.</div>'; return; }
        meals.slice(0, 24).forEach(meal => {
            const cat = meal.strCategory || 'Recipe';
            const area = meal.strArea || 'Global';
            const catStyle = getCatStyle(cat);
            const el = document.createElement('div');
            el.className = 'recipe-card bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer group flex flex-col h-full';
            el.innerHTML = `<div class="relative h-48 overflow-hidden bg-gray-100"><img src="${meal.strMealThumb}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"><div class="absolute bottom-3 left-3 flex gap-2">${meal.strCategory?`<span class="bg-white/95 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-gray-700 flex items-center gap-1 shadow-sm"><i class="fa-solid fa-tag text-emerald-500"></i> ${cat}</span>`:''}${meal.strArea?`<span class="bg-white/95 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-gray-700 flex items-center gap-1 shadow-sm"><i class="fa-solid fa-earth-americas text-blue-500"></i> ${area}</span>`:''}</div></div><div class="p-4 flex flex-col flex-1"><h3 class="font-bold text-gray-900 text-base mb-2 line-clamp-1 group-hover:text-primary transition-colors">${meal.strMeal}</h3><div class="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center text-xs font-semibold text-gray-500"><span class="flex items-center gap-1.5"><i class="fa-solid ${catStyle.icon} text-emerald-500"></i> Details</span><i class="fa-solid fa-arrow-right text-gray-300 group-hover:text-primary transition-colors"></i></div></div>`;
            el.onclick = () => this.navigate('meal-detail', meal.idMeal);
            grid.appendChild(el);
        });
    }

    async renderMealDetail(id) {
        this.container.innerHTML = '<div class="h-full flex items-center justify-center"><div class="loader"></div></div>';
        const meal = await this.mealService.getMealById(id);
        if(!meal) { this.container.innerHTML = '<div class="p-10 text-center">Meal not found</div>'; return; }
        let ings = '';
        for(let i=1; i<=20; i++) if(meal[`strIngredient${i}`]) ings += `<li class="flex gap-2 text-sm text-gray-700 p-2 bg-gray-50 rounded"><span class="font-bold text-dark">${meal[`strMeasure${i}`]}</span> ${meal[`strIngredient${i}`]}</li>`;

        this.container.innerHTML = `
            <div class="px-6 py-8 max-w-5xl mx-auto animate-fade-in pb-20">
                <button id="back-btn" class="mb-4 text-gray-500 hover:text-dark text-sm font-medium flex items-center gap-2"><i class="fa-solid fa-arrow-left"></i> Back</button>
                <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="relative h-80 w-full"><img src="${meal.strMealThumb}" class="w-full h-full object-cover"><div class="absolute bottom-0 left-0 p-8 w-full bg-gradient-to-t from-black/80 to-transparent"><h1 class="text-3xl font-bold text-white">${meal.strMeal}</h1></div></div>
                    <div class="border-b border-gray-100 p-6 flex flex-wrap justify-between items-center gap-6"><div class="flex gap-6"><div class="text-center"><div class="text-xs text-gray-400 font-bold uppercase">Calories</div><div class="font-bold text-xl">${nut.calories}</div></div></div><button id="log-meal-btn" class="bg-dark hover:bg-black text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"><i class="fa-solid fa-plus"></i> Log Meal</button></div>
                    <div class="p-8 grid md:grid-cols-3 gap-10"><div class="md:col-span-1"><h3 class="font-bold text-lg mb-4">Ingredients</h3><ul class="flex flex-col gap-2">${ings}</ul></div><div class="md:col-span-2"><h3 class="font-bold text-lg mb-4">Instructions</h3><p class="text-gray-600 leading-relaxed whitespace-pre-line">${meal.strInstructions}</p></div></div>
                </div>
            </div>`;
        document.getElementById('back-btn').onclick = () => this.navigate('home');
        document.getElementById('log-meal-btn').onclick = () => {
            this.foodLogService.addItem({ name: meal.strMeal, image: meal.strMealThumb, type: 'Meal', nutrition: nut });
            this.showNotification(`Logged: ${meal.strMeal}`);
        };
    }

    async renderScanner() {
        this.container.innerHTML = `
            <div class="px-6 py-8 md:px-10 max-w-[1200px] mx-auto animate-fade-in">
                <div class="mb-6"><h1 class="text-3xl font-bold text-dark mb-1">Product Scanner</h1><p class="text-gray-500 text-sm">Search packaged foods by name or barcode</p></div>
                <div class="bg-teal-600 rounded-xl p-6 md:p-8 mb-8 shadow-md">
                    <h3 class="text-white font-medium mb-4 text-base">Search for packaged food products to view nutrition information</h3>
                    <div class="flex gap-2 mb-6"><div class="flex-1 relative"><input id="scan-name-input" type="text" placeholder="Search by product name (e.g., Cheerios, Nutella...)" class="w-full pl-4 pr-10 py-3 rounded-lg focus:outline-none text-gray-700 text-sm"><i class="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i></div><button id="scan-name-btn" class="bg-white text-teal-700 font-bold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors shadow-sm text-sm">Search</button></div>
                    <div class="relative text-center mb-6"><div class="absolute inset-0 flex items-center"><div class="w-full border-t border-teal-500/50"></div></div><div class="relative"><span class="bg-teal-600 px-4 text-sm text-teal-100">or</span></div></div>
                    <div class="flex gap-2"><div class="flex-1 relative"><input id="scan-barcode-input" type="text" placeholder="Enter barcode number (e.g., 7613034626844)" class="w-full pl-4 pr-10 py-3 rounded-lg focus:outline-none text-gray-700 text-sm bg-teal-50/10 text-white placeholder-teal-200 border border-teal-500"><i class="fa-solid fa-barcode absolute right-4 top-1/2 -translate-y-1/2 text-teal-200"></i></div><button id="scan-barcode-btn" class="bg-amber-500 text-white font-bold px-6 py-3 rounded-lg hover:bg-amber-600 transition-colors shadow-sm text-sm flex items-center gap-2"><i class="fa-solid fa-magnifying-glass"></i> Lookup</button></div>
                </div>
                <div class="flex items-center gap-3 mb-8"><span class="text-sm font-medium text-gray-600">Filter by Nutri-Score:</span><button class="px-3 py-1 bg-gray-200 rounded text-xs font-bold text-gray-600">All</button><button class="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-bold ">A</button><button class="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">B</button><button class="px-3 py-1 bg-red-100 text-danger rounded text-xs font-bold ">C</button><button class="px-3 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">D</button><button class="px-3 py-1 bg-cyan-100 text-cyan-700 rounded text-xs font-bold ">E</button></div>
                <div class="mb-10"><h3 class="text-lg font-bold text-dark mb-4">Browse by Category</h3><div class="flex gap-3 overflow-x-auto no-scrollbar pb-2">${PRODUCT_CATEGORY_DATA.map(c => `<button class="prod-cat-btn ${c.color} text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-bold text-sm shadow-sm hover:opacity-90 transition min-w-max" data-cat="${c.name}"><i class="fa-solid ${c.icon}"></i> ${c.name}</button>`).join('')}</div></div>
                <div id="scan-results" class="grid gap-4 pb-20"><div class="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200"><div class="bg-white p-4 rounded-full shadow-sm mb-3"><i class="fa-solid fa-box-open text-3xl text-gray-300"></i></div><p class="text-gray-500 font-medium">No products to display</p></div></div>
            </div>`;

        const handleSearch = async (type) => {
            const inputId = type === 'name' ? 'scan-name-input' : 'scan-barcode-input';
            const query = document.getElementById(inputId).value.trim();
            if(!query) return;
            const resDiv = document.getElementById('scan-results');
            resDiv.innerHTML = '<div class="loader mx-auto"></div>';
            let prods = type === 'barcode' ? await this.productService.getProductByBarcode(query) : await this.productService.searchProduct(query);
            this.currentSearchProducts = prods;
            resDiv.innerHTML = prods.length === 0 ? '<div class="text-center py-10 text-gray-500">No products found.</div>' : '';
            prods.forEach((p, idx) => {
                const nut = p.nutriments || {};
                const cal = Math.round(nut['energy-kcal_100g'] || 0);
                const el = document.createElement('div');
                el.className = 'bg-white p-4 rounded-xl border border-gray-200 flex gap-4 items-center shadow-sm hover:shadow-md transition-all';
                el.innerHTML = `<div class="w-16 h-16 bg-gray-50 rounded-lg p-2 flex-shrink-0 relative"><img src="${p.image_front_small_url||''}" class="w-full h-full object-contain"></div><div class="flex-1"><h4 class="font-bold text-dark text-sm md:text-base">${p.product_name||'Unknown'}</h4><p class="text-xs text-gray-500 mb-1">${p.brands||''}</p><div class="flex gap-3 text-xs text-gray-500"><span><i class="fa-solid fa-fire text-orange-400"></i> ${cal} kcal</span></div></div><button class="add-btn bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white w-10 h-10 rounded-xl transition flex items-center justify-center" data-index="${idx}"><i class="fa-solid fa-plus"></i></button>`;
                resDiv.appendChild(el);
            });
            document.querySelectorAll('.add-btn').forEach(b => b.addEventListener('click', (e) => {
                const p = this.currentSearchProducts[e.currentTarget.dataset.index];
                const n = p.nutriments || {};
                this.foodLogService.addItem({ name: p.product_name, image: p.image_front_small_url, type: 'Product', nutrition: { calories: Math.round(n['energy-kcal_100g']||0), protein: Math.round(n.proteins_100g||0), carbs: Math.round(n.carbohydrates_100g||0), fat: Math.round(n.fat_100g||0) } });
                this.showNotification(`Logged: ${p.product_name}`);
            }));
        };
        document.getElementById('scan-name-btn').onclick = () => handleSearch('name');
        document.getElementById('scan-barcode-btn').onclick = () => handleSearch('barcode');
        document.querySelectorAll('.prod-cat-btn').forEach(btn => btn.addEventListener('click', () => { document.getElementById('scan-name-input').value = btn.dataset.cat; handleSearch('name'); }));
    }

    renderFoodLog() {
        const log = this.foodLogService.getLog();
        const totals = this.foodLogService.getTotals();
        const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        const weekDates = this.getWeeklyDates();

        const pCal = Math.min(100, Math.round((totals.calories / CONFIG.DAILY_LIMITS.calories) * 100));
        const pPro = Math.min(100, Math.round((totals.protein / CONFIG.DAILY_LIMITS.protein) * 100));
        const pCarb = Math.min(100, Math.round((totals.carbs / CONFIG.DAILY_LIMITS.carbs) * 100));
        const pFat = Math.min(100, Math.round((totals.fat / CONFIG.DAILY_LIMITS.fat) * 100));

        this.container.innerHTML = `
            <div class="px-6 py-8 md:px-10 max-w-[1200px] mx-auto animate-fade-in pb-20">
                <!-- Header -->
                <div class="mb-6">
                    <h1 class="text-3xl font-bold text-dark mb-1">Food Log</h1>
                    <p class="text-gray-500 text-sm">Track your daily nutrition and food intake</p>
                </div>

                <!-- Daily Log Banner -->
                <div class="bg-gradient-to-r from-[#6366F1] to-[#A855F7] rounded-xl p-6 text-white flex justify-between items-center mb-8 shadow-lg">
                    <div class="flex items-center gap-3">
                        <div class="bg-white/20 p-2 rounded-lg"><i class="fa-solid fa-clipboard-list text-xl"></i></div>
                        <div>
                            <h2 class="text-lg font-bold">Daily Food Log</h2>
                            <p class="text-xs text-white/80">Track and monitor your daily nutrition intake</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs text-white/80">Today</div>
                        <div class="text-lg font-bold">${todayStr}</div>
                    </div>
                </div>

                <!-- Main Content Box -->
                <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
                    <h3 class="font-bold text-dark mb-6 flex items-center gap-2"><i class="fa-solid fa-fire text-orange-500"></i> Today's Nutrition</h3>
                    
                    <!-- Progress Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        ${this.renderProgressCard('Calories', totals.calories, CONFIG.DAILY_LIMITS.calories, pCal, 'green', 'kcal')}
                        ${this.renderProgressCard('Protein', totals.protein, CONFIG.DAILY_LIMITS.protein, pPro, 'blue', 'g')}
                        ${this.renderProgressCard('Carbs', totals.carbs, CONFIG.DAILY_LIMITS.carbs, pCarb, 'orange', 'g')}
                        ${this.renderProgressCard('Fat', totals.fat, CONFIG.DAILY_LIMITS.fat, pFat, 'purple', 'g')}
                    </div>

                    <!-- Logged Items List -->
                    <div>
                        <h4 class="text-sm font-bold text-dark mb-4">Logged Items (${log.items.length})</h4>
                        
                        ${log.items.length === 0 ? `
                            <div class="flex flex-col items-center justify-center py-10 text-center">
                                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300 text-2xl">
                                    <i class="fa-solid fa-utensils"></i>
                                </div>
                                <p class="text-gray-500 font-medium mb-1">No food logged today</p>
                                <p class="text-gray-400 text-xs mb-6">Start tracking your nutrition by logging meals or scanning products</p>
                                <div class="flex gap-3">
                                    <button class="bg-[#10B981] hover:bg-[#059669] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors" id="empty-browse-btn">
                                        <i class="fa-solid fa-plus"></i> Browse Recipes
                                    </button>
                                    <button class="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors" id="empty-scan-btn">
                                        <i class="fa-solid fa-barcode"></i> Scan Product
                                    </button>
                                </div>
                            </div>
                        ` : `
                            <div class="space-y-3">
                                ${log.items.map(item => `
                                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group">
                                        <div class="flex items-center gap-3">
                                            <img src="${item.image || ''}" class="w-10 h-10 rounded-md object-cover bg-white">
                                            <div>
                                                <div class="font-bold text-sm text-dark">${item.name}</div>
                                                <div class="text-xs text-gray-500">${item.nutrition.calories} kcal • ${item.type}</div>
                                            </div>
                                        </div>
                                        <button class="text-gray-300 hover:text-red-500 transition-colors del-btn" data-id="${item.id}">
                                            <i class="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>

                <!-- Weekly Overview -->
                <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
                    <h3 class="font-bold text-dark mb-6 flex items-center gap-2"><i class="fa-solid fa-calendar text-blue-500"></i> Weekly Overview</h3>
                    <div class="grid grid-cols-7 gap-2">
                        ${weekDates.map((d, i) => `
                            <div class="text-center p-3 rounded-xl ${i === 6 ? 'bg-blue-100' : 'hover:bg-gray-50'}">
                                <div class="text-xs text-gray-500 mb-1">${d.dayName}</div>
                                <div class="text-sm font-bold text-dark mb-1">${d.dayNum}</div>
                                <div class="text-[10px] ${i === 6 && totals.calories > 0 ? 'text-blue-600 font-bold' : 'text-gray-300'}">${i === 6 ? totals.calories : '0'} <br> kcal</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Bottom Stats -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                        <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-500 text-xl"><i class="fa-solid fa-chart-line"></i></div>
                        <div><div class="text-xs text-gray-500">Weekly Average</div><div class="text-lg font-bold text-dark">0 kcal</div></div>
                    </div>
                    <div class="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-500 text-xl"><i class="fa-solid fa-utensils"></i></div>
                        <div><div class="text-xs text-gray-500">Total Items This Week</div><div class="text-lg font-bold text-dark">0 items</div></div>
                    </div>
                    <div class="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                        <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-500 text-xl"><i class="fa-solid fa-bullseye"></i></div>
                        <div><div class="text-xs text-gray-500">Days On Goal</div><div class="text-lg font-bold text-dark">0 / 7</div></div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('empty-browse-btn')?.addEventListener('click', () => this.navigate('home'));
        document.getElementById('empty-scan-btn')?.addEventListener('click', () => this.navigate('scanner'));

        document.querySelectorAll('.del-btn').forEach(b => {
            b.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.foodLogService.removeItem(id);
                this.renderFoodLog();
            });
        });
    }

    renderProgressCard(label, val, max, pct, color, unit) {
        const bgColors = { green: 'bg-green-500', blue: 'bg-blue-500', orange: 'bg-orange-500', purple: 'bg-purple-500' };
        const textColors = { green: 'text-green-500', blue: 'text-blue-500', orange: 'text-orange-500', purple: 'text-purple-500' };
        
        return `
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-600">${label}</span>
                    <span class="text-xs font-bold ${textColors[color]}">${pct}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                    <div class="${bgColors[color]} h-1.5 rounded-full" style="width: ${pct}%"></div>
                </div>
                <div class="flex justify-between text-xs">
                    <span class="font-bold ${textColors[color]}">${val} ${unit}</span>
                    <span class="text-gray-400">/ ${max} ${unit}</span>
                </div>
            </div>
        `;
    }

    getWeeklyDates() {
        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push({
                dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNum: d.getDate()
            });
        }
        return dates;
    }

}
window.addEventListener('DOMContentLoaded', () => { new App(); });