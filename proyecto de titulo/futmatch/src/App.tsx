import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import ProfilePage from './pages/ProfilePage';
import MatchPage from './pages/MatchPage';
import Layout from './layouts/Layout';

const App = () => {
  return (
    <Router>
      <Layout>
        <Switch>
          <Route path="/" exact component={HomePage} />
          <Route path="/explore" component={ExplorePage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/matches" component={MatchPage} />
        </Switch>
      </Layout>
    </Router>
  );
};

export default App;