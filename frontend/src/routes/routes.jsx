import Chartes from "../pages/Chartes";
import ForgotPassword from "../pages/ForgotPassword";
import Login from "../pages/Login";
import Logout from "../pages/Logout"
import Register from "../pages/Register";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminSportDetail from "../pages/admin/AdminSportDetail";
import SuperAdminDashboard from "../pages/superAdmin/SuperAdminDashboard";
import UserDashboard from "../pages/user/UserDashboard";
import AdminSports from "../pages/admin/AdminSports";
import UserDetailTeam from "../pages/user/UserDetailTeam";
import UserRegisterTeam from "../pages/user/UserRegisterTeam";
import UserPayment from "../pages/user/UserPayment";
import Profile from "../pages/common/Profile";
import AdminTeamDetail from "../pages/admin/AdminTeamDetail";
import SuperAdminParameters from "../pages/superAdmin/SuperAdminParameters";
import SuperAdminUser from "../pages/superAdmin/SuperAdminUser";
import UserEcoIC from "../pages/user/UserEcoIC";
import UserPack from "../pages/user/UserPack";
import SuperAdminStats from "../pages/superAdmin/SuperAdminPacksStats";
import SuperAdminParticipants from "../pages/superAdmin/SuperAdminParticipant";
import SuperAdminSports from "../pages/superAdmin/SuperAdminSports";
import SuperAdminSchoolsTeams from "../pages/superAdmin/SuperAdminAcceuil";
import RespoDelegDashboard from "../pages/respodeleg/RespoDelegDashboard";
import RespoDelegRegisterTeam from "../pages/respodeleg/RespoDelegRegisterTeam";
import RespoDelegDetailTeam from "../pages/respodeleg/RespoDelegDetailTeam";
// Define user routes
const routesForUser = [
    {
        path: "/",
        element: <UserDashboard />,
        name: 'Mes équipes'
    },
    {
        path: "/register-team",
        element: <UserRegisterTeam />,
        name: 'Inscrire une équipe'
    },
    {
        path: "/pack",
        element: <UserPack />,
        name: 'Packs et Goodies',
    },
    {
        path: "/ecotoss",
        element: <UserEcoIC />,
        name: 'Covoiturage',
    },
    {
        path: "/team/:id",
        element: <UserDetailTeam />,
        name: 'Détail d équipe',
        hidden: true,
    },
    {
        path: "/payment",
        element: <UserPayment />,
        name: 'Paiement',
    },
    {
        path: "/logout",
        element: <Logout />,
        name: 'Déconnexion',
        hidden: true,
    },
]

// Define admin Route
const routesForAdmin = [
    {
        path: "/",
        element: <AdminDashboard />,
        name: '',
    },
    {
        path: "/sport",
        element: <AdminSports />,
        name: 'Sports',
    },
    {
        path: "/sport/:id",
        element: <AdminSportDetail />,
        hidden: true,
    },
    {
        path: "/team/:id",
        element: <AdminTeamDetail />,
        hidden: true,
    },
    {
        path: "/logout",
        element: <Logout />,
        name: 'Déconnexion',
        hidden: true,
    },
]


const routesForRespoDeleg = [
    {
        path: "/",
        element: <RespoDelegDashboard />,
        name: 'Mes équipes'
    },
    {
        path: "/register-team",
        element: <RespoDelegRegisterTeam />,
        name: 'Inscrire une équipe'
    },
    {
        path: "/team/:id",
        element: <RespoDelegDetailTeam />,
        name: 'Détail d équipe',
        hidden: true,
    },
    {
        path: "/logout",
        element: <Logout />,
        name: 'Déconnexion',
        hidden: true,
    },
    {
        path: "/pack",
        element: <UserPack />,
        name: 'Packs et Goodies',
    },
    {
        path: "/ecotoss",
        element: <UserEcoIC />,
        name: 'Covoiturage',
    },
]

// Define super admin route
const routesForSuperAdmin = [
    {
        path: "/",
        element: <SuperAdminDashboard />,
        name: 'Tableau de bord',
    },
    {
        path: "/team/:id",
        element: <AdminTeamDetail />,
        hidden: true,
    },
    {
        path: '/stats',
        element: <SuperAdminStats />,
        name: 'Statistiques',
    },
    {
        path: '/participants_superadmin',
        element: <SuperAdminParticipants />,
        name: 'Participants',
    },
    {
        path: '/sportsuperadmin',
        element: <SuperAdminSports />,
        name: 'Sports',
    },
    {
        path: '/users',
        element: <SuperAdminUser />,
        name: 'Utilisateurs',
    },
    
    {
        path: '/parameters',
        element: <SuperAdminParameters />,
        name: 'Paramètres',
    },
    
    
    {
        path: "/logout",
        element: <Logout />,
        hidden: true,
    },
    {
        path: "/schools-teams",
        element: <SuperAdminSchoolsTeams />,
        name: 'Écoles et équipes',
    },
]

// Define public routes accessible to all users
const routesForPublic = [
    {
        path: "/profile",
        element: <Profile />,
        hidden: true,
    },
    {
        path: "/about-us",
        element: <div>About Us</div>,
    },
    {
        path: "/charte",
        element: <Chartes />,
    },
];


const routesForNotAuthenticatedOnly = [
    {
        path: "/",
        element: <Login />,
    },
    {
        path: "/register",
        element: <Register />,
    },
    {
        path: "/forgot-password",
        element: <ForgotPassword />,
    },
];


export { routesForUser, routesForAdmin, routesForSuperAdmin, routesForPublic, routesForNotAuthenticatedOnly, routesForRespoDeleg }