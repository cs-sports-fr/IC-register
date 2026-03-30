//
import Input from './Input';
import Button from './Button';
import Grid from './Grid';
import Typography from './Typography';
import Divider from './Divider';
import Link from './Link';
import ListItem from './ListItem';
import Box from './Box';
import TableCell from './TableCell';



// ----------------------------------------------------------------------

export default function ComponentsOverrides(theme) {
    return Object.assign(
        Input(theme),
        Button(theme),
        Grid(theme),
        Typography(theme),
        Divider(theme),
        Link(theme),
        ListItem(theme),
        Box(theme),
        TableCell(theme),
    );
}
