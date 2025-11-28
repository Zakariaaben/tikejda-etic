
import { useEffect } from "react";
import useLocalStorage from "use-local-storage";
import { HelpCircle, Users, Hash, AlertTriangle, Bus, EyeOff } from "lucide-react";
import { Button, Modal, Tabs } from "@heroui/react";
import { MAX_GROUP_SIZE } from "@repartition-tikejda/api/constants";

export function InfoModal() {
	const [hasSeenGuide, setHasSeenGuide] = useLocalStorage("has-seen-guide", false);
	const [isOpen, setIsOpen] = useLocalStorage("info-modal-open", false);

	// Open modal on first visit
	useEffect(() => {
		if (!hasSeenGuide) {
			setIsOpen(true);
		}
	}, [hasSeenGuide, setIsOpen]);

	const handleClose = () => {
		setIsOpen(false);
	};

	const handleDontShowAgain = () => {
		setHasSeenGuide(true);
		setIsOpen(false);
	};

	return (
		<>
			<Button
				variant="ghost"
				size="sm"
				className="gap-2"
				onPress={() => setIsOpen(true)}
			>
				<HelpCircle className="h-4 w-4" />
				<span className="hidden sm:inline">Comment ça marche ?</span>
			</Button>			<Modal>
				<Modal.Container isOpen={isOpen} onOpenChange={setIsOpen} variant="blur">
					<Modal.Dialog className="w-[90vw] max-w-[600px]  max-h-[90vh] overflow-hidden">
						{() => (
							<>
								<Modal.CloseTrigger />
								<Modal.Header>
									<Modal.Heading className="text-lg sm:text-xl">Guide d'utilisation</Modal.Heading>
								</Modal.Header>
								<Modal.Body className="overflow-y-auto ">
									<p className="text-muted text-xs sm:text-sm mb-3 sm:mb-4">
										Tout ce que tu dois savoir pour former ton groupe
									</p>
									<Tabs className="min-h-64 sm:min-h-72" orientation="vertical">
										<Tabs.ListContainer className="shrink-0 overflow-x-auto">
											<Tabs.List aria-label="Guide sections" className="flex-nowrap">
												<Tabs.Tab id="objectif" className="gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
													<Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
													<span className="hidden xs:inline">Objectif</span>
													<Tabs.Indicator />
												</Tabs.Tab>
												<Tabs.Tab id="limite" className="gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
													<Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
													<span className="hidden xs:inline">Limite</span>
													<Tabs.Indicator />
												</Tabs.Tab>
												<Tabs.Tab id="externes" className="gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
													<AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
													<span className="hidden xs:inline">Externes</span>
													<Tabs.Indicator />
												</Tabs.Tab>
												<Tabs.Tab id="important" className="gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
													<Bus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
													<span className="hidden xs:inline">Important</span>
													<Tabs.Indicator />
												</Tabs.Tab>
											</Tabs.List>
										</Tabs.ListContainer>

										<Tabs.Panel id="objectif" className="flex-1 p-3 sm:p-4">
											<div className="space-y-2 sm:space-y-3">
												<h3 className="font-semibold text-base sm:text-lg text-foreground flex items-center gap-2">
													<Users className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0" />
													Quel est le but ?
												</h3>
												<p className="text-muted text-sm sm:text-base leading-relaxed">
													L'objectif est de <span className="text-foreground font-medium">sélectionner les personnes avec lesquelles tu veux être sûr d'être dans le même bus</span> lors de la sortie.
												</p>
												<p className="text-muted text-sm sm:text-base leading-relaxed">
													Forme ton groupe en invitant les membres que tu souhaites avoir à tes côtés pendant le trajet !
												</p>
											</div>
										</Tabs.Panel>

										<Tabs.Panel id="limite" className="flex-1 p-3 sm:p-4">
											<div className="space-y-2 sm:space-y-3">
												<h3 className="font-semibold text-base sm:text-lg text-foreground flex items-center gap-2">
													<Hash className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0" />
													La limite de {MAX_GROUP_SIZE} personnes
												</h3>
												<p className="text-muted text-sm sm:text-base leading-relaxed">
													Chaque groupe est limité à <span className="text-foreground font-medium">{MAX_GROUP_SIZE} personnes maximum</span>.
												</p>
												<p className="text-muted text-sm sm:text-base leading-relaxed">
													Cette limite permet d'assurer une répartition équilibrée dans les bus.
												</p>
											</div>
										</Tabs.Panel>

										<Tabs.Panel id="externes" className="flex-1 p-3 sm:p-4">
											<div className="space-y-2 sm:space-y-3">
												<h3 className="font-semibold text-base sm:text-lg text-foreground flex items-center gap-2">
													<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning shrink-0" />
													Note importante
												</h3>
												<div className="p-2 sm:p-3 rounded-lg bg-warning/10 border border-warning-soft-hover">
													<p className="text-foreground text-sm sm:text-base leading-relaxed">
														Les <span className="font-medium">personnes externes</span> que tu as ajoutées seront <span className="font-medium">automatiquement avec toi</span>.
													</p>
												</div>
												<p className="text-muted text-sm sm:text-base leading-relaxed">
													Invite ici uniquement les <span className="text-foreground font-medium">membres internes au club</span>.
												</p>
											</div>
										</Tabs.Panel>

										<Tabs.Panel id="important" className="flex-1 p-3 sm:p-4">
											<div className="space-y-2 sm:space-y-3">
												<h3 className="font-semibold text-base sm:text-lg text-foreground flex items-center gap-2">
													<Bus className="h-4 w-4 sm:h-5 sm:w-5 text-danger shrink-0" />
													À retenir
												</h3>
												<div className="p-2 sm:p-3 rounded-lg bg-danger/10 border border-danger-soft-hover">
													<p className="text-foreground text-sm sm:text-base leading-relaxed">
														<span className="font-medium">Deux groupes différents ne sont pas garantis d'être dans le même bus.</span>
													</p>
												</div>
												<p className="text-muted text-sm sm:text-base leading-relaxed">
													Sois <span className="text-foreground font-medium">minutieux dans tes choix</span> !
												</p>
											</div>
										</Tabs.Panel>
									</Tabs>
								</Modal.Body>
								<Modal.Footer className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
									<Button 
										variant="ghost" 
										size="sm"
										className="gap-2 text-muted w-full sm:w-auto"
										onPress={handleDontShowAgain}
									>
										<EyeOff className="h-4 w-4" />
										Ne plus afficher
									</Button>
									<Button variant="primary" className="w-full sm:w-auto" onPress={handleClose}>
										J'ai compris !
									</Button>
								</Modal.Footer>
							</>
						)}
					</Modal.Dialog>
				</Modal.Container>
			</Modal>
		</>
	);
}
