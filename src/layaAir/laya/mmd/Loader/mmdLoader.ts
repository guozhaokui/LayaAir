import { Loader } from "../../net/Loader";
import { PmxLoader } from "./pmxLoader";


Loader.registerLoader(["pmx"], PmxLoader, Loader.MESH);
Loader.registerLoader(["pmd"], PmxLoader, Loader.MESH);