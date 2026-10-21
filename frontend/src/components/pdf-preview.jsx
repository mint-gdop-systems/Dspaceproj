import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

export default function PdfPreview({ fileUrl }) {
	const [numPages, setNumPages] = useState(0);
	const [currentPage, setCurrentPage] = useState(1);
	const [scale, setScale] = useState(1);
	const [rotation, setRotation] = useState(0); // user rotation: 0 | 90 | 180 | 270
	const [error, setError] = useState(null);
	const [pageSizes, setPageSizes] = useState({});

	const containerRef = useRef(null);
	const pageRefs = useRef({});

	const pageRefCallbacks = useMemo(
		() =>
			Array.from({ length: numPages }, (_, index) => (element) => {
				pageRefs.current[index + 1] = element;
			}),
		[numPages],
	);

	const onDocumentLoadSuccess = useCallback(({ numPages }) => {
		setNumPages(numPages);
		setCurrentPage(1);
		setRotation(0);
		setPageSizes({});
		setError(null);
	}, []);

	const onPageLoadSuccess = useCallback((page) => {
		// width/height are measured at the page's own (intrinsic) rotation;
		// `rotate` is that intrinsic rotation, which scanned PDFs often have set.
		const { width, height } = page.getViewport({ scale: 1 });
		const pageNumber = page.pageNumber;
		const rotate = page.rotate ?? 0;

		setPageSizes((previousSizes) => {
			const previous = previousSizes[pageNumber];

			if (
				previous?.width === width &&
				previous?.height === height &&
				previous?.rotate === rotate
			) {
				return previousSizes;
			}

			return {
				...previousSizes,
				[pageNumber]: { width, height, rotate },
			};
		});
	}, []);

	const onDocumentLoadError = useCallback((err) => {
		console.error("PDF Load Error:", err);
		setError("Failed to load PDF.");
	}, []);

	const goToPrevPage = useCallback(() => {
		const page = Math.max(currentPage - 1, 1);

		pageRefs.current[page]?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});

		setCurrentPage(page);
	}, [currentPage]);

	const goToNextPage = useCallback(() => {
		const page = Math.min(currentPage + 1, numPages);

		pageRefs.current[page]?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});

		setCurrentPage(page);
	}, [currentPage, numPages]);

	const zoomIn = useCallback(() => {
		setScale((prev) => Math.min(prev + 0.25, 3));
	}, []);

	const zoomOut = useCallback(() => {
		setScale((prev) => Math.max(prev - 0.25, 0.5));
	}, []);

	const rotate = useCallback(
		(delta) => {
			setRotation((prev) => (prev + delta + 360) % 360);

			// Page heights change when rotating, which would otherwise shift the
			// scroll position onto a different page. Re-anchor on the current one.
			requestAnimationFrame(() => {
				pageRefs.current[currentPage]?.scrollIntoView({ block: "start" });
			});
		},
		[currentPage],
	);

	const rotateClockwise = useCallback(() => rotate(90), [rotate]);
	const rotateCounterClockwise = useCallback(() => rotate(-90), [rotate]);

	useEffect(() => {
		if (!numPages || !containerRef.current) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				const visiblePages = entries
					.filter((entry) => entry.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio);

				if (visiblePages.length > 0) {
					const pageNumber = Number(visiblePages[0].target.dataset.pageNumber);

					setCurrentPage(pageNumber);
				}
			},
			{
				root: containerRef.current,
				threshold: [0.25, 0.5, 0.75, 1],
			},
		);

		Object.values(pageRefs.current).forEach((pageElement) => {
			if (pageElement) {
				observer.observe(pageElement);
			}
		});

		return () => observer.disconnect();
	}, [numPages]);

	const isSideways = rotation % 180 !== 0;

	return (
		<div className="flex h-full w-full flex-col bg-background">
			<div className="flex items-center justify-between gap-2 border-b p-2">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={goToPrevPage}
						disabled={currentPage <= 1}
						className="rounded border px-2 py-1 disabled:opacity-50"
					>
						Prev
					</button>

					<span className="text-sm">
						Page {currentPage} of {numPages || "--"}
					</span>

					<button
						type="button"
						onClick={goToNextPage}
						disabled={!numPages || currentPage >= numPages}
						className="rounded border px-2 py-1 disabled:opacity-50"
					>
						Next
					</button>
				</div>

				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={rotateCounterClockwise}
							disabled={!numPages}
							aria-label="Rotate counterclockwise"
							title="Rotate counterclockwise"
							className="rounded border px-2 py-1 disabled:opacity-50"
						>
							↺
						</button>

						<button
							type="button"
							onClick={rotateClockwise}
							disabled={!numPages}
							aria-label="Rotate clockwise"
							title="Rotate clockwise"
							className="rounded border px-2 py-1 disabled:opacity-50"
						>
							↻
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={zoomOut}
							className="rounded border px-2 py-1"
						>
							−
						</button>

						<span className="w-12 text-center text-sm">
							{Math.round(scale * 100)}%
						</span>

						<button
							type="button"
							onClick={zoomIn}
							className="rounded border px-2 py-1"
						>
							+
						</button>
					</div>
				</div>
			</div>

			<div
				ref={containerRef}
				className="flex-1 overflow-auto bg-background p-4"
			>
				{error && <div className="text-center text-red-500">{error}</div>}

				{!error && fileUrl && (
					<Document
						file={fileUrl}
						onLoadSuccess={onDocumentLoadSuccess}
						onLoadError={onDocumentLoadError}
						loading={
							<div className="text-center text-muted-foreground">
								Loading PDF...
							</div>
						}
					>
						<div className="flex flex-col items-center gap-6">
							{Array.from({ length: numPages }, (_, index) => {
								const pageNumber = index + 1;
								const pageSize = pageSizes[pageNumber] ||
									pageSizes[1] || { width: 612, height: 792 };
								const shouldRenderPage =
									Math.abs(pageNumber - currentPage) <= 1;

								// Swap dimensions for the placeholder when rotated sideways.
								const boxWidth = isSideways ? pageSize.height : pageSize.width;
								const boxHeight = isSideways ? pageSize.width : pageSize.height;

								// `rotate` on <Page> replaces the page's intrinsic rotation, so add
								// the user's rotation on top of it. Leave it undefined at 0 so the
								// default (intrinsic) rotation applies untouched.
								const pageRotate =
									rotation === 0
										? undefined
										: ((pageSizes[pageNumber]?.rotate ?? 0) + rotation) % 360;

								return (
									<div
										key={pageNumber}
										ref={pageRefCallbacks[index]}
										data-page-number={pageNumber}
										className="bg-white shadow"
										style={{
											minWidth: boxWidth * scale,
											minHeight: boxHeight * scale,
										}}
									>
										{shouldRenderPage && (
											<Page
												pageNumber={pageNumber}
												scale={scale}
												rotate={pageRotate}
												onLoadSuccess={onPageLoadSuccess}
												renderAnnotationLayer
												renderTextLayer
												loading={null}
											/>
										)}
									</div>
								);
							})}
						</div>
					</Document>
				)}
			</div>
		</div>
	);
}
