import { Box, Button, Typography } from "@mui/material";
import { ApiICConnected } from "../../service/axios";
import { useEffect, useState } from "react";
import SchoolList from "../schools/SchoolList";
import ModifySchool from "../schools/ModifySchool";
import AddSchool from "../schools/AddSchool";

const SchoolConfigCard = () => {

    const [schools, setSchools] = useState([]);
    const fetchData = () => {
        ApiICConnected.get('/schools').then(response => {
            setSchools(response.data);
        }
        ).catch(error => {
            console.log(error);
        });
    }

    useEffect(() => {
        fetchData();
    }, []);

    const [schoolSelected, setSchoolSelected] = useState(null);
    const [isModifyOpen, setIsModifyOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);

    const headerList =
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 2.5 }}>
            <Typography variant={'h6'}>Liste des écoles</Typography>
            <Box sx={{ width: '25%', mx: 2.5 }}>
                <Button onClick={() => setIsAddOpen(true)}>Ajouter une école</Button>
            </Box>
        </Box>

    return (
        <Box >
            <SchoolList columns={columns} schools={schools}
                headerItem={headerList}
                modify={true}
                onModify={(school) => { setSchoolSelected(school); setIsModifyOpen(true) }}
                sx={{ borderRadius: '0.8rem', mb: 2 }} variant='outlined'
            />
            <ModifySchool open={isModifyOpen} onClose={() => { fetchData(); setIsModifyOpen(false) }} schoolInput={schoolSelected} />

            <AddSchool open={isAddOpen} onClose={() => { fetchData(); setIsAddOpen(false) }} />
        </Box>
    );
}

export default SchoolConfigCard;

const columns = [
    { label: "N°", align: "left", key: "id", type: 'index' },
    { label: "Nom", align: "center", key: "name" },
    { label: "IDF", align: "center", key: "isInIDF", type: 'boolean' },
    {label: 'Deleg',align: 'center', key: 'isDeleg', type: 'boolean'},
    {label:'Paiement', align: 'center', key: 'isPaid', type: 'boolean'},
    {label:'Caution', align: 'center', key: 'isCautionPaid', type: 'boolean'},
]