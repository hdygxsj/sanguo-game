export type CityCommand='recruit'|'develop'|'march'|'role';
export function CityActions({cityId,owned,playerId,disabled,onAction}:{cityId:number;owned:boolean;playerId:string|null;disabled:boolean;onAction:(action:CityCommand,id:number)=>void}){
  return <div className="city-actions">
    {!playerId?<><p>你正在观战。选择君主后可经营城池、调兵出征。</p><button disabled={disabled} onClick={()=>onAction('role',cityId)}>选择君主</button></>:<>
      {owned&&<button disabled={disabled} onClick={()=>onAction('develop',cityId)}>建设</button>}<button disabled={disabled} onClick={()=>onAction('march',cityId)}>查看军队</button>
      <small>{disabled?'回放或战局结束时不可下令。':'城池与军队分别管理。出征请先选择一支军队，再点击地图目标。'}</small>
    </>}
  </div>;
}
