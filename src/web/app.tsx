import { Route, Switch } from "wouter";
import { Provider } from "./components/provider";
import { ThemeProvider } from "./components/ThemeProvider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

import Index from "./pages/index";
import StorePage from "./pages/store";
import BookPage from "./pages/book";
import SignInPage from "./pages/sign-in";
import SignUpPage from "./pages/sign-up";
import DashboardPage from "./pages/dashboard/index";
import CreateBookPage from "./pages/dashboard/create";
import MyBooksPage from "./pages/dashboard/books";
import PublishPage from "./pages/dashboard/publish";
import DownloadPage from "./pages/download";
import AdminPage from "./pages/admin";
import TermsPage from "./pages/terms";
import EditBookPage from "./pages/dashboard/edit";
import ForgotPasswordPage from "./pages/forgot-password";
import ResetPasswordPage from "./pages/reset-password";
import UploadBookPage from "./pages/dashboard/upload-book";
import ReaderPage from "./pages/reader";

function App() {
  return (
    <ThemeProvider>
    <Provider>
      <Switch>
        <Route path="/" component={Index} />
        <Route path="/store" component={StorePage} />
        <Route path="/book/:id" component={BookPage} />
        <Route path="/sign-in" component={SignInPage} />
        <Route path="/sign-up" component={SignUpPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/dashboard/create" component={CreateBookPage} />
        <Route path="/dashboard/books" component={MyBooksPage} />
        <Route path="/dashboard/publish/:id" component={PublishPage} />
        <Route path="/download/:orderId" component={DownloadPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/dashboard/edit/:id" component={EditBookPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/dashboard/upload-book" component={UploadBookPage} />
        <Route path="/read/:bookId" component={ReaderPage} />
      </Switch>
      {import.meta.env.DEV && <AgentFeedback />}
      {<RunableBadge />}
    </Provider>
    </ThemeProvider>
  );
}

export default App;
