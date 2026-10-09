import {Component,type ReactNode} from 'react';
export class WorkspaceBoundary extends Component<{children:ReactNode;onReload:()=>void},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<main className="workspace-loading" role="alert"><p>战局资源加载失败，可能是页面版本已更新。存档不会丢失。</p><button className="primary-button" onClick={this.props.onReload}>刷新并重新加载</button></main>:this.props.children;}
}
