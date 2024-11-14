import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/app';

// check https://medium.com/javascript-journal-unlocking-project-potential/building-a-typescript-react-project-from-scratch-with-webpack-b224a3f84e3b
// check https://www.youtube.com/watch?v=9jGy8K78Elg

// const App: React.FC = () => {
//   return <div>Hello, world!</div>;
// };

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(<App />);