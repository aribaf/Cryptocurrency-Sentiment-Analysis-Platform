import React, {useEffect, useState} from 'react'
import RecentList from '../recent_list'


export default function News(){
const [items, setItems] = useState([])
useEffect(()=>{
getNews(30).then(r=> setItems(r.data.data || r.data)).catch(()=>{})
},[])
return (
<div>
<h1 className="text-2xl font-bold mb-4">News Sentiment</h1>
<RecentList items={items} />
</div>
)
}