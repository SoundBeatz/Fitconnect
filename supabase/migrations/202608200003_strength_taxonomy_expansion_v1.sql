-- FitConnect Strength Taxonomy Expansion v1
-- Adds a broad full-body strength/bodybuilding foundation without guessing product mappings.

insert into public.body_regions(slug,name,description,sort_order,is_active,parent_id)
select v.slug,v.name,v.description,v.sort_order,true,p.id
from (values
  ('upper-back','Bovenrug','Trapezius, rhomboidei en scapulaire retractoren.',21,'back'),
  ('lats','Latissimus / brede rug','Brede rugspieren en verticale trekfocus.',22,'back'),
  ('lower-back','Onderrug','Lumbale erectoren en rompstabilisatie.',23,'back'),
  ('biceps','Biceps','Voorzijde bovenarm.',41,'arms'),
  ('triceps','Triceps','Achterzijde bovenarm.',42,'arms'),
  ('forearms','Onderarmen','Grip en onderarmflexoren/extensoren.',43,'arms'),
  ('calves','Kuiten','Gastrocnemius en soleus.',53,'legs')
) v(slug,name,description,sort_order,parent_slug)
join public.body_regions p on p.slug=v.parent_slug
on conflict (slug) do update set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order,parent_id=excluded.parent_id,is_active=true,updated_at=now();

insert into public.muscle_groups(slug,name,anatomical_name,description,sort_order,is_active,body_region_id)
select v.slug,v.name,v.anatomical_name,v.description,v.sort_order,true,b.id
from (values
  ('latissimus-dorsi','Latissimus dorsi','Musculus latissimus dorsi','Primaire brede rugspier voor adductie en extensie van de schouder.',70,'lats'),
  ('trapezius-rhomboids','Trapezius & rhomboids','M. trapezius / mm. rhomboidei','Scapulaire retractie en bovenrugcontrole.',80,'upper-back'),
  ('spinal-erectors','Rugstrekkers','Musculi erector spinae','Extensie en stabilisatie van de wervelkolom.',90,'lower-back'),
  ('biceps-brachii','Biceps','Musculus biceps brachii','Elleboogflexie en supinatie.',100,'biceps'),
  ('triceps-brachii','Triceps','Musculus triceps brachii','Elleboogextensie.',110,'triceps'),
  ('hamstrings-group','Hamstrings','Mm. biceps femoris, semitendinosus, semimembranosus','Kniebuiging en heupextensie.',120,'hamstrings'),
  ('gluteus-maximus','Gluteus maximus','Musculus gluteus maximus','Krachtige heupextensie.',130,'glutes'),
  ('calves-group','Kuiten','M. gastrocnemius / m. soleus','Plantairflexie van de enkel.',140,'calves'),
  ('rectus-abdominis','Rechte buikspier','Musculus rectus abdominis','Rompflexie en anti-extensie.',150,'core'),
  ('obliques-core','Schuine buikspieren','Mm. obliquus externus/internus','Rotatie, laterale flexie en rompstabiliteit.',160,'core')
) v(slug,name,anatomical_name,description,sort_order,body_slug)
join public.body_regions b on b.slug=v.body_slug
on conflict (slug) do update set name=excluded.name,anatomical_name=excluded.anatomical_name,description=excluded.description,sort_order=excluded.sort_order,body_region_id=excluded.body_region_id,is_active=true,updated_at=now();

insert into public.exercises(slug,name,movement_pattern,description,difficulty,sort_order,is_active)
values
 ('flat-bench-press','Flat Bench Press','horizontal press','Horizontale borstpress met barbell.','intermediate',100,true),
 ('incline-bench-press','Incline Bench Press','horizontal press','Schuine borstpress met nadruk op bovenste borst.','intermediate',110,true),
 ('dumbbell-bench-press','Dumbbell Bench Press','horizontal press','Borstpress met dumbbells.','intermediate',120,true),
 ('cable-chest-fly','Cable Chest Fly','horizontal adduction','Kabel-fly voor borst adductie.','beginner',130,true),
 ('push-up','Push-Up','horizontal press','Bodyweight horizontale press.','beginner',140,true),
 ('pull-up','Pull-Up','vertical pull','Verticale bodyweight trekbeweging.','intermediate',150,true),
 ('lat-pulldown','Lat Pulldown','vertical pull','Verticale kabeltrek voor de brede rug.','beginner',160,true),
 ('seated-cable-row','Seated Cable Row','horizontal pull','Horizontale kabelrow voor rug en scapulaire retractie.','beginner',170,true),
 ('barbell-bent-over-row','Barbell Bent-Over Row','horizontal pull','Vrije horizontale row met barbell.','intermediate',180,true),
 ('deadlift','Deadlift','hinge','Compound hip hinge vanaf de vloer.','advanced',190,true),
 ('face-pull','Face Pull','horizontal pull','Kabeltrek naar gezicht voor achterste schouders en bovenrug.','beginner',200,true),
 ('barbell-biceps-curl','Barbell Biceps Curl','elbow flexion','Biceps curl met rechte of EZ-stang.','beginner',210,true),
 ('dumbbell-biceps-curl','Dumbbell Biceps Curl','elbow flexion','Unilaterale biceps curl met dumbbells.','beginner',220,true),
 ('hammer-curl','Hammer Curl','elbow flexion','Neutrale-greep curl voor biceps/brachialis.','beginner',230,true),
 ('cable-triceps-pushdown','Cable Triceps Pushdown','elbow extension','Kabel pushdown voor triceps.','beginner',240,true),
 ('overhead-triceps-extension','Overhead Triceps Extension','elbow extension','Triceps extensie boven het hoofd.','beginner',250,true),
 ('back-squat','Back Squat','squat','Barbell squat voor quadriceps, glutes en romp.','advanced',260,true),
 ('romanian-deadlift','Romanian Deadlift','hinge','Hip hinge met nadruk op hamstrings en glutes.','intermediate',270,true),
 ('lying-leg-curl','Lying Leg Curl','knee flexion','Geïsoleerde kniebuiging voor hamstrings.','beginner',280,true),
 ('seated-leg-curl','Seated Leg Curl','knee flexion','Zittende kniebuiging voor hamstrings.','beginner',290,true),
 ('hip-thrust','Hip Thrust','hip extension','Gerichte heupextensie voor glutes.','intermediate',300,true),
 ('standing-calf-raise','Standing Calf Raise','plantar flexion','Staande kuithef.','beginner',310,true),
 ('seated-calf-raise','Seated Calf Raise','plantar flexion','Zittende kuithef met nadruk op soleus.','beginner',320,true),
 ('cable-crunch','Cable Crunch','trunk flexion','Belaste rompflexie aan kabel.','beginner',330,true),
 ('plank','Plank','anti-extension','Isometrische rompstabilisatie.','beginner',340,true),
 ('hanging-leg-raise','Hanging Leg Raise','hip flexion/core','Hangende beenhef met sterke corebelasting.','intermediate',350,true),
 ('machine-chest-press','Machine Chest Press','horizontal press','Geleide horizontale borstpress.','beginner',360,true),
 ('pec-deck-fly','Pec Deck Fly','horizontal adduction','Geleide borstfly.','beginner',370,true),
 ('machine-biceps-curl','Machine Biceps Curl','elbow flexion','Geleide biceps curl.','beginner',380,true),
 ('machine-triceps-extension','Machine Triceps Extension','elbow extension','Geleide triceps extensie.','beginner',390,true)
on conflict (slug) do update set name=excluded.name,movement_pattern=excluded.movement_pattern,description=excluded.description,difficulty=excluded.difficulty,sort_order=excluded.sort_order,is_active=true,updated_at=now();

insert into public.equipment_types(slug,name,equipment_group,description,sort_order,is_active)
values
 ('flat-bench','Flat Bench','bench','Vlakke trainingsbank.',140,true),
 ('adjustable-incline-bench','Adjustable Incline Bench','bench','Verstelbare bank voor vlakke en incline posities.',150,true),
 ('chest-press-machine','Chest Press Machine','strength-machine','Geleide horizontale borstpress.',160,true),
 ('pec-deck-machine','Pec Deck / Chest Fly Machine','strength-machine','Geleide horizontale borstfly.',170,true),
 ('lat-pulldown-machine','Lat Pulldown','strength-machine','Verticale trekmachine.',180,true),
 ('seated-row-machine','Seated Row','strength-machine','Horizontale rugtrekmachine.',190,true),
 ('biceps-curl-machine','Biceps Curl Machine','strength-machine','Geleide biceps curl.',200,true),
 ('triceps-extension-machine','Triceps Extension Machine','strength-machine','Geleide triceps extensie.',210,true),
 ('leg-curl-machine','Leg Curl Machine','strength-machine','Liggende of zittende hamstring curl.',220,true),
 ('hip-thrust-machine','Hip Thrust / Glute Drive','strength-machine','Geleide heupextensie voor glutes.',230,true),
 ('calf-raise-machine','Calf Raise Machine','strength-machine','Staande of zittende kuitmachine.',240,true),
 ('ab-crunch-machine','Ab Crunch Machine','strength-machine','Geleide buikspiermachine.',250,true),
 ('smith-machine','Smith Machine','rack','Geleide barbell voor squats, presses en hinges.',260,true),
 ('pull-up-station','Pull-Up Station','bodyweight','Optrekstation of geïntegreerde pull-up bar.',270,true),
 ('cable-station','Cable Station','cable','Enkel of dubbel kabelstation.',280,true)
on conflict (slug) do update set name=excluded.name,equipment_group=excluded.equipment_group,description=excluded.description,sort_order=excluded.sort_order,is_active=true,updated_at=now();

-- Exercise -> primary muscle mappings.
with map(exercise_slug,muscle_slug,relevance) as (values
 ('flat-bench-press','pectoralis-sternocostal',100),('incline-bench-press','pectoralis-clavicular',100),('dumbbell-bench-press','pectoralis-sternocostal',100),('cable-chest-fly','pectoralis-sternocostal',100),('push-up','pectoralis-sternocostal',95),('machine-chest-press','pectoralis-sternocostal',100),('pec-deck-fly','pectoralis-sternocostal',100),
 ('pull-up','latissimus-dorsi',100),('lat-pulldown','latissimus-dorsi',100),('seated-cable-row','trapezius-rhomboids',100),('barbell-bent-over-row','latissimus-dorsi',90),('barbell-bent-over-row','trapezius-rhomboids',90),('deadlift','spinal-erectors',90),('face-pull','posterior-deltoid',95),('face-pull','trapezius-rhomboids',90),
 ('barbell-biceps-curl','biceps-brachii',100),('dumbbell-biceps-curl','biceps-brachii',100),('hammer-curl','biceps-brachii',90),('machine-biceps-curl','biceps-brachii',100),
 ('cable-triceps-pushdown','triceps-brachii',100),('overhead-triceps-extension','triceps-brachii',100),('machine-triceps-extension','triceps-brachii',100),
 ('back-squat','quadriceps-group',100),('back-squat','gluteus-maximus',85),('romanian-deadlift','hamstrings-group',100),('romanian-deadlift','gluteus-maximus',85),('lying-leg-curl','hamstrings-group',100),('seated-leg-curl','hamstrings-group',100),('hip-thrust','gluteus-maximus',100),('standing-calf-raise','calves-group',100),('seated-calf-raise','calves-group',100),
 ('cable-crunch','rectus-abdominis',100),('plank','rectus-abdominis',90),('plank','obliques-core',90),('hanging-leg-raise','rectus-abdominis',90)
)
insert into public.exercise_muscles(exercise_id,muscle_group_id,role,relevance)
select e.id,m.id,'primary',map.relevance from map join public.exercises e on e.slug=map.exercise_slug join public.muscle_groups m on m.slug=map.muscle_slug
on conflict do nothing;

-- Exercise -> equipment possibilities.
with map(exercise_slug,equipment_slug,suitability) as (values
 ('flat-bench-press','barbell',100),('flat-bench-press','flat-bench',100),('flat-bench-press','power-rack',95),('flat-bench-press','smith-machine',85),
 ('incline-bench-press','barbell',100),('incline-bench-press','adjustable-incline-bench',100),('incline-bench-press','power-rack',95),('incline-bench-press','smith-machine',85),
 ('dumbbell-bench-press','dumbbells',100),('dumbbell-bench-press','flat-bench',90),('dumbbell-bench-press','adjustable-incline-bench',100),
 ('cable-chest-fly','functional-trainer',100),('cable-chest-fly','cable-station',95),('push-up','flat-bench',50),
 ('machine-chest-press','chest-press-machine',100),('pec-deck-fly','pec-deck-machine',100),
 ('pull-up','pull-up-station',100),('pull-up','power-rack',90),('lat-pulldown','lat-pulldown-machine',100),('lat-pulldown','functional-trainer',85),
 ('seated-cable-row','seated-row-machine',100),('seated-cable-row','functional-trainer',90),('barbell-bent-over-row','barbell',100),('deadlift','barbell',100),('deadlift','power-rack',70),('face-pull','functional-trainer',100),('face-pull','cable-station',95),
 ('barbell-biceps-curl','barbell',100),('dumbbell-biceps-curl','dumbbells',100),('hammer-curl','dumbbells',100),('machine-biceps-curl','biceps-curl-machine',100),('cable-triceps-pushdown','functional-trainer',100),('cable-triceps-pushdown','cable-station',100),('overhead-triceps-extension','dumbbells',90),('overhead-triceps-extension','functional-trainer',100),('machine-triceps-extension','triceps-extension-machine',100),
 ('back-squat','barbell',100),('back-squat','power-rack',100),('back-squat','smith-machine',85),('romanian-deadlift','barbell',100),('romanian-deadlift','dumbbells',90),('lying-leg-curl','leg-curl-machine',100),('seated-leg-curl','leg-curl-machine',100),('hip-thrust','hip-thrust-machine',100),('hip-thrust','barbell',90),('standing-calf-raise','calf-raise-machine',100),('seated-calf-raise','calf-raise-machine',100),('cable-crunch','functional-trainer',100),('cable-crunch','cable-station',100),('hanging-leg-raise','pull-up-station',100)
)
insert into public.exercise_equipment(exercise_id,equipment_type_id,suitability)
select e.id,q.id,map.suitability from map join public.exercises e on e.slug=map.exercise_slug join public.equipment_types q on q.slug=map.equipment_slug
on conflict do nothing;

-- Strength training and bodybuilding both use this foundation.
with target_exercises as (select id from public.exercises where sort_order between 100 and 390), target_sports as (select id from public.sports where slug in ('strength-training','bodybuilding'))
insert into public.sport_exercises(sport_id,exercise_id,relevance)
select s.id,e.id,100 from target_sports s cross join target_exercises e on conflict do nothing;

-- Powerlifting-specific core lifts.
with ex as (select id from public.exercises where slug in ('flat-bench-press','back-squat','deadlift','romanian-deadlift')), sp as (select id from public.sports where slug='powerlifting')
insert into public.sport_exercises(sport_id,exercise_id,relevance) select sp.id,ex.id,100 from sp cross join ex on conflict do nothing;

-- Goal relevance: hypertrophy/general strength on all; max strength strongest on compounds.
with ex as (select id from public.exercises where sort_order between 100 and 390), goals as (select id,slug from public.training_goals where slug in ('hypertrophy','general-strength'))
insert into public.exercise_goals(exercise_id,goal_id,relevance) select ex.id,g.id,100 from ex cross join goals g on conflict do nothing;
with ex as (select id from public.exercises where slug in ('flat-bench-press','incline-bench-press','pull-up','barbell-bent-over-row','deadlift','back-squat','romanian-deadlift')), g as (select id from public.training_goals where slug='max-strength')
insert into public.exercise_goals(exercise_id,goal_id,relevance) select ex.id,g.id,95 from ex cross join g on conflict do nothing;
