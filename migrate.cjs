const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'pages');
const componentsDir = path.join(__dirname, 'src', 'components');

const replaceInFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Any function containing await must be async
  content = content.replace(/const (loadData|loadDashboardData|fetchSettings|handleSave|handleDelete|handleSubmit|generateBill|handleLogin|handleUpdateUser|handleAddUser) = (\([^)]*\)) => {/g, 'const $1 = async $2 => {');
  
  // Make useEffect anonymous functions async if they need to call getAll etc? No, React forbids async useEffect. 
  // The common pattern in this project is:
  // useEffect(() => { loadData() }, [])
  // So loadData is defined outside as const loadData = () => { let tenants = tenantStore.getAll() }
  // Making loadData async is correct.

  // But we have cases like `tenantStore.getAll().forEach(...)` which we must await first
  content = content.replace(/(buildingStore|tenantStore|billStore|paymentStore|userStore|settingsStore)\.(getAll|getById|add|update|remove|get|save|authenticate)\(/g, 'await $1.$2(');

  // Fix await await issues
  content = content.replace(/await\s+await/g, 'await');
  
  // Header.jsx has:
  // useEffect(() => {
  //   const bills = billStore.getAll()
  //   ...
  // }, [])
  // We need to fix this specifically by finding useEffect(() => { ... store.getAll() ...}) and wrapping it.
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${filePath}`);
};

const pages = fs.readdirSync(srcDir).filter(f => f.endsWith('.jsx'));
pages.forEach(p => replaceInFile(path.join(srcDir, p)));
replaceInFile(path.join(componentsDir, 'Sidebar.jsx'));
replaceInFile(path.join(componentsDir, 'Header.jsx'));

