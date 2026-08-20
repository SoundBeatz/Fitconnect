-- FitConnect Strength v2 + Functional/Hyrox foundation

insert into public.body_regions(slug,name,description,sort_order,is_active,parent_id)
select v.slug,v.name,v.description,v.sort_order,true,p.id
from (values
 ('adductors','Adductoren','Binnenzijde bovenbeen en heupadductie.',54,'legs'),
 ('abductors','Abductoren','Laterale heupstabilisatie en abductie.',55,'legs'),
 ('grip','Grip / onderarm','Gripkracht en onderarmbelasting.',44,'arms')
) v(slug,name,description,sort_order,parent_slug)
join public.body_regions p on p.slug=v.parent_slug
on conflict (slug) do update set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order,parent_id=excluded.parent_id,is_active=true,updated_at=now();

insert into public.muscle_groups(slug,name,anatomical_name,description,sort_order,is_active,body_region_id)
select v.slug,v.name,v.anatomical_name,v.description,v.sort_order,true,b.id
from (values
 ('adductors-group','Adductoren','Mm. adductores','Heupadductie en stabilisatie.',170,'adductors'),
 ('gluteus-medius','Gluteus medius','Musculus gluteus medius','Heupabductie en bekkenstabiliteit.',180,'abductors'),
 ('forearm-grip-group','Grip / onderarmen','Flexoren en extensoren onderarm','Grip, polsstabiliteit en draagkracht.',190,'grip')
) v(slug,name,anatomical_name,description,sort_order,body_slug)
join public.body_regions b on b.slug=v.body_slug
on conflict (slug) do update set name=excluded.name,anatomical_name=excluded.anatomical_name,description=excluded.description,sort_order=excluded.sort_order,body_region_id=excluded.body_region_id,is_active=true,updated_at=now();

insert into public.exercises(slug,name,movement_pattern,description,difficulty,sort_order,is_active)
values
 ('bulgarian-split-squat','Bulgarian Split Squat','single-leg squat','Unilaterale squat voor quadriceps en glutes.','intermediate',400,true),
 ('walking-lunge','Walking Lunge','lunge','Dynamische lunge voor benen en glutes.','intermediate',410,true),
 ('step-up','Step-Up','single-leg squat','Opstapbeweging voor quadriceps en glutes.','beginner',420,true),
 ('hip-abduction','Hip Abduction','hip abduction','Gerichte heupabductie.','beginner',430,true),
 ('hip-adduction','Hip Adduction','hip adduction','Gerichte heupadductie.','beginner',440,true),
 ('farmer-carry','Farmer Carry','loaded carry','Zware carry voor grip, core en locomotie.','intermediate',450,true),
 ('sled-push','Sled Push','loaded locomotion','Duwen van verzwaarde sled.','intermediate',460,true),
 ('sled-pull','Sled Pull','loaded locomotion','Trekken van verzwaarde sled.','intermediate',470,true),
 ('wall-ball-shot','Wall Ball Shot','squat-to-press','Squat naar explosieve worp tegen target.','intermediate',480,true),
 ('ski-erg','SkiErg','cyclical conditioning','Staande ski-pull conditioning.','beginner',490,true),
 ('rowing-erg','Row Erg','cyclical conditioning','Roei-ergometer conditioning.','beginner',500,true),
 ('sandbag-lunge','Sandbag Lunge','loaded lunge','Lunge met sandbagbelasting.','intermediate',510,true),
 ('burpee-broad-jump','Burpee Broad Jump','plyometric conditioning','Burpee gecombineerd met voorwaartse sprong.','advanced',520,true),
 ('box-step-over','Box Step Over','single-leg conditioning','Opstap en oversteek met unilaterale belasting.','intermediate',530,true)
on conflict (slug) do update set name=excluded.name,movement_pattern=excluded.movement_pattern,description=excluded.description,difficulty=excluded.difficulty,sort_order=excluded.sort_order,is_active=true,updated_at=now();

insert into public.equipment_types(slug,name,equipment_group,description,sort_order,is_active)
values
 ('split-squat-stand','Split Squat Stand','strength-accessory','Ondersteuning voor rear-foot elevated split squats.',290,true),
 ('hip-abductor-machine','Hip Abductor Machine','strength-machine','Geleide heupabductie.',300,true),
 ('hip-adductor-machine','Hip Adductor Machine','strength-machine','Geleide heupadductie.',310,true),
 ('farmers-handles','Farmer Carry Handles','functional','Draaghandles voor loaded carries.',320,true),
 ('sled','Prowler / Sled','functional','Sled voor push en pull werk.',330,true),
 ('wall-ball','Wall Ball','functional','Verzwaarde zachte bal voor wall ball shots.',340,true),
 ('wall-ball-target','Wall Ball Target','functional','Doelplaat voor wall ball shots.',350,true),
 ('ski-ergometer','SkiErg','cardio','Staande ski-ergometer.',360,true),
 ('row-ergometer','Row Ergometer','cardio','Roei-ergometer.',370,true),
 ('sandbag','Training Sandbag','functional','Sandbag voor carries en lunges.',380,true),
 ('plyo-box','Plyo Box','functional','Box voor step-ups en sprongen.',390,true)
on conflict (slug) do update set name=excluded.name,equipment_group=excluded.equipment_group,description=excluded.description,sort_order=excluded.sort_order,is_active=true,updated_at=now();

with map(exercise_slug,muscle_slug,relevance) as (values
 ('bulgarian-split-squat','quadriceps-group',100),('bulgarian-split-squat','gluteus-maximus',95),
 ('walking-lunge','quadriceps-group',95),('walking-lunge','gluteus-maximus',95),
 ('step-up','quadriceps-group',90),('step-up','gluteus-maximus',90),
 ('hip-abduction','gluteus-medius',100),('hip-adduction','adductors-group',100),
 ('farmer-carry','forearm-grip-group',100),('farmer-carry','obliques-core',90),
 ('sled-push','quadriceps-group',95),('sled-push','gluteus-maximus',90),
 ('sled-pull','hamstrings-group',85),('sled-pull','gluteus-maximus',85),
 ('wall-ball-shot','quadriceps-group',90),('wall-ball-shot','anterior-deltoid',85),
 ('sandbag-lunge','quadriceps-group',95),('sandbag-lunge','gluteus-maximus',95),
 ('box-step-over','quadriceps-group',90),('box-step-over','gluteus-maximus',90)
)
insert into public.exercise_muscles(exercise_id,muscle_group_id,role,relevance)
select e.id,m.id,'primary',map.relevance from map join public.exercises e on e.slug=map.exercise_slug join public.muscle_groups m on m.slug=map.muscle_slug
on conflict do nothing;

with map(exercise_slug,equipment_slug,suitability) as (values
 ('bulgarian-split-squat','dumbbells',100),('bulgarian-split-squat','split-squat-stand',95),('bulgarian-split-squat','adjustable-incline-bench',85),
 ('walking-lunge','dumbbells',100),('walking-lunge','barbell',80),('step-up','plyo-box',100),('step-up','dumbbells',90),
 ('hip-abduction','hip-abductor-machine',100),('hip-adduction','hip-adductor-machine',100),
 ('farmer-carry','farmers-handles',100),('farmer-carry','dumbbells',90),
 ('sled-push','sled',100),('sled-pull','sled',100),
 ('wall-ball-shot','wall-ball',100),('wall-ball-shot','wall-ball-target',100),
 ('ski-erg','ski-ergometer',100),('rowing-erg','row-ergometer',100),
 ('sandbag-lunge','sandbag',100),('burpee-broad-jump','plyo-box',40),('box-step-over','plyo-box',100),('box-step-over','sandbag',80)
)
insert into public.exercise_equipment(exercise_id,equipment_type_id,suitability)
select e.id,q.id,map.suitability from map join public.exercises e on e.slug=map.exercise_slug join public.equipment_types q on q.slug=map.equipment_slug
on conflict do nothing;

with map(sport_slug,exercise_slug,relevance) as (values
 ('strength-training','bulgarian-split-squat',100),('strength-training','walking-lunge',95),('strength-training','step-up',90),('strength-training','hip-abduction',90),('strength-training','hip-adduction',90),('strength-training','farmer-carry',80),
 ('bodybuilding','bulgarian-split-squat',100),('bodybuilding','walking-lunge',90),('bodybuilding','hip-abduction',95),('bodybuilding','hip-adduction',90),
 ('functional-training','farmer-carry',100),('functional-training','sled-push',100),('functional-training','sled-pull',100),('functional-training','wall-ball-shot',95),('functional-training','sandbag-lunge',95),('functional-training','box-step-over',90),
 ('cross-training','farmer-carry',95),('cross-training','sled-push',90),('cross-training','wall-ball-shot',100),('cross-training','ski-erg',90),('cross-training','rowing-erg',90),('cross-training','burpee-broad-jump',90),
 ('hyrox','ski-erg',100),('hyrox','sled-push',100),('hyrox','sled-pull',100),('hyrox','burpee-broad-jump',100),('hyrox','rowing-erg',100),('hyrox','farmer-carry',100),('hyrox','sandbag-lunge',100),('hyrox','wall-ball-shot',100),
 ('conditioning','ski-erg',95),('conditioning','rowing-erg',95),('conditioning','sled-push',90),('conditioning','farmer-carry',85)
)
insert into public.sport_exercises(sport_id,exercise_id,relevance)
select s.id,e.id,map.relevance from map join public.sports s on s.slug=map.sport_slug join public.exercises e on e.slug=map.exercise_slug
on conflict do nothing;

with map(exercise_slug,goal_slug,relevance) as (values
 ('bulgarian-split-squat','hypertrophy',100),('bulgarian-split-squat','general-strength',95),('walking-lunge','hypertrophy',90),('walking-lunge','general-strength',90),('hip-abduction','hypertrophy',95),('hip-adduction','hypertrophy',90),
 ('farmer-carry','general-strength',90),('farmer-carry','sport-performance',100),('farmer-carry','conditioning',90),
 ('sled-push','power',95),('sled-push','conditioning',100),('sled-push','sport-performance',100),
 ('sled-pull','conditioning',100),('sled-pull','sport-performance',100),('wall-ball-shot','conditioning',100),('wall-ball-shot','power',90),
 ('ski-erg','conditioning',100),('ski-erg','endurance',100),('rowing-erg','conditioning',100),('rowing-erg','endurance',100),
 ('sandbag-lunge','conditioning',95),('sandbag-lunge','general-strength',90),('burpee-broad-jump','conditioning',100),('burpee-broad-jump','power',90),('box-step-over','conditioning',90)
)
insert into public.exercise_goals(exercise_id,goal_id,relevance)
select e.id,g.id,map.relevance from map join public.exercises e on e.slug=map.exercise_slug join public.training_goals g on g.slug=map.goal_slug
on conflict do nothing;
