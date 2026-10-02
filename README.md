# DevPulse - GitHub Inspector

DevPulse is a responsive React application that allows users to inspect GitHub developers and explore their public repositories.

## Features

- Search GitHub developers by username
- Display developer profile information and statistics
- View public repositories
- Filter repositories by multiple programming languages
- Sort repositories by:
  - Recently Updated
  - Most Stars
  - Most Forks
- Debounced GitHub API search
- URL-driven search, language filters, and sorting
- Pin repositories to a persistent Pinboard
- Pinboard managed with React Context and useReducer
- Persistent pins using localStorage
- Loading and error handling
- Performance optimization using useMemo and useCallback

## Technologies Used

- React.js
- Vite
- JavaScript
- GitHub REST API
- React Hooks
- Context API
- useReducer
- localStorage
- CSS

## Environment Setup

Create a .env file in the project root and add:

VITE_API_TOKEN=your_github_token

Do not commit the .env file to GitHub.

## Running the Project

```bash
npm install
npm run dev