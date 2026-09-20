import {supabase} from './supabase';

const S='accounting';

export const money=n=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(Number(n)||0);

export const dateLabel=v=>v?new Date(v).toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'}):'—';

const check=(e,c)=>{if(e)throw new Error(`${c}: ${e.message}`)};

export async function getSales(){
  const {data,error}=await supabase
    .from('orders')
    .select('*')
    .order('created_at',{ascending:false})
    .limit(500);
  check(error,'Could not load sales');
  return data||[];
}

export async function getExpenses(){
  let r=await supabase
    .schema(S)
    .from('expenses')
    .select('*')
    .order('expense_date',{ascending:false})
    .limit(500);

  if(r.error){
    r=await supabase
      .schema(S)
      .from('expenses')
      .select('*')
      .order('created_at',{ascending:false})
      .limit(500);
  }

  check(r.error,'Could not load accounting expenses');
  return r.data||[];
}

export async function getAccounts(){
  const {data,error}=await supabase
    .schema(S)
    .from('accounts')
    .select('*')
    .order('code',{ascending:true});

  check(error,'Could not load chart of accounts');
  return data||[];
}

export async function createExpense(p){
  const {data,error}=await supabase
    .schema(S)
    .rpc('create_expense',{
      p_description:p.description,
      p_amount:p.amount,
      p_category:p.category,
      p_expense_date:p.expense_date
    });

  check(error,'Could not save expense');
  return data;
}

export async function getLedger(){
  const {data,error}=await supabase
    .schema(S)
    .from('journal_entries')
    .select('id,entry_number,entry_date,source_type,description,status,journal_lines(id,account_id,description,debit,credit,accounts(code,name))')
    .order('entry_date',{ascending:false})
    .order('created_at',{ascending:false})
    .limit(500);

  check(error,'Could not load general ledger');
  return data||[];
}

export async function getTrialBalance(){
  const {data,error}=await supabase
    .schema(S)
    .from('journal_lines')
    .select('account_id,debit,credit,accounts(code,name,account_type)')
    .limit(5000);

  check(error,'Could not load trial balance');

  const map=new Map();

  for(const row of data||[]){
    const a=row.accounts||{};
    const key=row.account_id;

    if(!map.has(key)){
      map.set(key,{
        code:a.code||'—',
        name:a.name||'—',
        type:a.account_type||'—',
        debit:0,
        credit:0
      });
    }

    const x=map.get(key);
    x.debit+=Number(row.debit)||0;
    x.credit+=Number(row.credit)||0;
  }

  return [...map.values()].sort(
    (a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true})
  );
}

export async function getDashboardData(){
  const [sales,expenses,products]=await Promise.all([
    getSales(),
    getExpenses(),
    supabase.from('products').select('id,name,stock,active').limit(1000)
  ]);

  check(products.error,'Could not load inventory');

  const ok=sales.filter(o=>
    !['cancelled','canceled','refunded']
      .includes(String(o.order_status||o.status||'').toLowerCase())
  );

  const st=ok.reduce(
    (a,o)=>a+Number(o.total??o.subtotal??0),
    0
  );

  const ex=expenses
    .filter(e=>String(e.status||'posted').toLowerCase()!=='void')
    .reduce((a,e)=>a+Number(e.amount||0),0);

  const ps=products.data||[];

  return{
    sales:st,
    expenses:ex,
    orders:ok.length,
    stock:ps.reduce((a,p)=>a+Number(p.stock||0),0),
    lowStock:ps.filter(p=>Number(p.stock||0)<=5&&p.active!==false).length,
    recentSales:ok.slice(0,5),
    recentExpenses:expenses.slice(0,5)
  };
}
