import fs from 'fs';
import path from 'path';

const dir = 'frontend/src/modules/twin/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));
for (const file of files) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/from '\.\.\/context\//g, "from '../../../context/");
  content = content.replace(/from '\.\.\/utils\//g, "from '../../../utils/");
  content = content.replace(/from '\.\.\/constants\//g, "from '../../../constants/");
  content = content.replace(/from '\.\.\/services\//g, "from '../../../services/");
  content = content.replace(/from '\.\/3d\//g, "from '../../../components/3d/");
  content = content.replace(/from '\.\/CockpitHUD'/g, "from '../../telemetry/components/CockpitHUD'");
  fs.writeFileSync(p, content, 'utf8');
  console.log('Updated ' + file);
}
