import { createClient } from "@/lib/supabase/server";
import { getPortfolioTransactions } from "@/lib/transactions";
import { getMarketPricesForUser } from "@/lib/market-data";
import { calculatePortfolio } from "@/lib/portfolio-calculations.mjs";
import { getHistoricalFxRates } from "@/lib/fx-rates";
import { convertTransactionsAtHistoricalFx } from "@/lib/currency-conversion.mjs";
import { PortfolioGoals } from "./portfolio-goals";

export default async function TargetsPage() {
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return null;
 const [{data,error},{transactions, error:txError}]=await Promise.all([supabase.from("portfolio_goals").select("id,name,goal_type,target_amount::text,fiat_currency,deadline,is_enabled,created_at").eq("user_id",user.id).order("created_at",{ascending:false}),getPortfolioTransactions()]);
 const goals=(data??[]) as Array<{id:string;name:string;goal_type:"portfolio_value"|"investment_amount";target_amount:string;fiat_currency:string;deadline:string|null;is_enabled:boolean;created_at:string}>;
 const progress:Record<string,{amount:string|null;error:string|null}>={};
 for(const currency of [...new Set(goals.map(g=>g.fiat_currency))]) {
   if(txError){for(const type of ["portfolio_value","investment_amount"])progress[`${currency}:${type}`]={amount:null,error:txError};continue;}
   if(!transactions.length){for(const type of ["portfolio_value","investment_amount"])progress[`${currency}:${type}`]={amount:"0",error:null};continue;}
   try {
    const first=transactions.reduce((d,t)=>t.occurred_at.slice(0,10)<d?t.occurred_at.slice(0,10):d,transactions[0].occurred_at.slice(0,10));
    const needsFx=transactions.some(t=>t.fiat_currency!==currency); const history=needsFx?await getHistoricalFxRates(first,new Date().toISOString().slice(0,10)):{};
    const converted=convertTransactionsAtHistoricalFx(transactions,currency,history); const symbols=[...new Set(transactions.map(t=>t.asset_symbol))];
    const quotes=await getMarketPricesForUser(supabase,user.id,symbols,currency); const [summary]=calculatePortfolio(converted,{[currency]:quotes.prices});
    progress[`${currency}:investment_amount`]={amount:summary?.totalInvested??"0",error:null};
    progress[`${currency}:portfolio_value`]={amount:summary?.complete?summary.currentValue:null,error:summary?.complete?null:"Current prices are unavailable for one or more holdings."};
   } catch(e){for(const type of ["portfolio_value","investment_amount"])progress[`${currency}:${type}`]={amount:null,error:e instanceof Error?e.message:"Progress could not be calculated."};}
 }
 return <PortfolioGoals goals={goals} progress={progress} error={error?"Targets could not be loaded. Apply the portfolio alerts and goals migration and reload.":null}/>;
}
